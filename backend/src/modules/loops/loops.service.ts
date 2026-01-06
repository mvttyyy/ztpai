import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RabbitMQService, QUEUES } from '../../rabbitmq/rabbitmq.service';
import { CreateLoopDto } from './dto/create-loop.dto';
import { UpdateLoopDto } from './dto/update-loop.dto';
import { FilterLoopsDto, SortField, SortOrder } from './dto/filter-loops.dto';
import { LoopStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class LoopsService {
  constructor(
    private prisma: PrismaService,
    private rabbitMQ: RabbitMQService,
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    let baseSlug = this.generateSlug(title);
    if (!baseSlug) baseSlug = 'loop';
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.prisma.loop.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format "${filePath}"`
      );
      const data = JSON.parse(stdout);
      if (data.format && data.format.duration) {
        return parseFloat(data.format.duration);
      }
      throw new Error('Could not parse duration from ffprobe output');
    } catch (error) {
      console.error('Error getting audio duration:', error);
      return 30;
    }
  }

  async create(userId: string, dto: CreateLoopDto, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    let duration = dto.duration;
    if (!duration) {
      duration = await this.getAudioDuration(file.path);
    }

    if (duration < 1) {
      throw new BadRequestException('Loop must be at least 1 second long');
    }
    if (duration > 60) {
      throw new BadRequestException('Loop cannot exceed 60 seconds (1 minute)');
    }

    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const originalFileName = `originals/${file.filename}`;
    const slug = await this.generateUniqueSlug(dto.title);

    const loop = await this.prisma.loop.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        bpm: dto.bpm,
        key: dto.key,
        duration: duration,
        genre: dto.genre,
        originalFile: originalFileName,
        fileHash,
        userId,
        status: LoopStatus.PENDING,
      },
    });

    if (dto.tags && dto.tags.length > 0) {
      for (const tagName of dto.tags) {
        const tag = await this.prisma.tag.upsert({
          where: { name: tagName.toLowerCase() },
          update: {},
          create: { name: tagName.toLowerCase() },
        });

        await this.prisma.loopTag.create({
          data: {
            loopId: loop.id,
            tagId: tag.id,
          },
        });
      }
    }

    await this.rabbitMQ.publish(QUEUES.AUDIO_PROCESSING, {
      loopId: loop.id,
      filePath: file.path,
      type: 'transcode',
    });

    return this.findById(loop.id);
  }

  async findAll(filters: FilterLoopsDto) {
    const {
      search,
      bpmMin,
      bpmMax,
      key,
      genre,
      tags,
      userId,
      status,
      sortBy = SortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (!userId && !status) {
      where.status = LoopStatus.READY;
    } else if (status) {
      where.status = status;
    }

    if (search) {
      const numericSearch = parseInt(search, 10);
      if (!isNaN(numericSearch) && numericSearch > 0 && numericSearch <= 300) {
        where.bpm = numericSearch;
      } else {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    if (bpmMin || bpmMax) {
      where.bpm = {};
      if (bpmMin) where.bpm.gte = bpmMin;
      if (bpmMax) where.bpm.lte = bpmMax;
    }

    if (key) where.key = key;
    if (genre) where.genre = { contains: genre, mode: 'insensitive' };
    if (userId) where.userId = userId;

    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: { in: tags.map(t => t.toLowerCase()) },
          },
        },
      };
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [loops, total] = await Promise.all([
      this.prisma.loop.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tags: {
            include: { tag: true },
          },
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.loop.count({ where }),
    ]);

    return {
      data: loops.map(loop => ({
        ...loop,
        tags: loop.tags.map(lt => lt.tag),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByIdOrSlug(idOrSlug: string, userId?: string) {
    let loop = await this.prisma.loop.findUnique({
      where: { slug: idOrSlug },
      include: {
        tags: {
          include: { tag: true },
        },
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        ratings: userId ? {
          where: { userId },
          take: 1,
        } : false,
        favorites: userId ? {
          where: { userId },
          take: 1,
        } : false,
      },
    });

    if (!loop && UUID_REGEX.test(idOrSlug)) {
      loop = await this.prisma.loop.findUnique({
        where: { id: idOrSlug },
        include: {
          tags: {
            include: { tag: true },
          },
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          ratings: userId ? {
            where: { userId },
            take: 1,
          } : false,
          favorites: userId ? {
            where: { userId },
            take: 1,
          } : false,
        },
      });
    }

    if (!loop) {
      throw new NotFoundException('Loop not found');
    }

    return {
      ...loop,
      tags: loop.tags.map(lt => lt.tag),
      userRating: loop.ratings?.[0]?.value || null,
      isFavorited: loop.favorites?.length > 0 || false,
    };
  }

  async findById(id: string, userId?: string) {
    return this.findByIdOrSlug(id, userId);
  }

  async update(id: string, userId: string, dto: UpdateLoopDto, isAdmin = false) {
    const loop = await this.prisma.loop.findUnique({ where: { id } });

    if (!loop) {
      throw new NotFoundException('Loop not found');
    }

    if (loop.userId !== userId && !isAdmin) {
      throw new BadRequestException('You can only update your own loops');
    }

    if (dto.tags) {
      await this.prisma.loopTag.deleteMany({ where: { loopId: id } });

      for (const tagName of dto.tags) {
        const tag = await this.prisma.tag.upsert({
          where: { name: tagName.toLowerCase() },
          update: {},
          create: { name: tagName.toLowerCase() },
        });

        await this.prisma.loopTag.create({
          data: {
            loopId: id,
            tagId: tag.id,
          },
        });
      }
    }

    const { tags, ...updateData } = dto;

    return this.prisma.loop.update({
      where: { id },
      data: updateData,
      include: {
        tags: {
          include: { tag: true },
        },
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async delete(id: string, userId: string, isAdmin = false) {
    const loop = await this.prisma.loop.findUnique({ where: { id } });

    if (!loop) {
      throw new NotFoundException('Loop not found');
    }

    if (loop.userId !== userId && !isAdmin) {
      throw new BadRequestException('You can only delete your own loops');
    }

    if (loop.originalFile && fs.existsSync(loop.originalFile)) {
      fs.unlinkSync(loop.originalFile);
    }
    if (loop.previewFile && fs.existsSync(loop.previewFile)) {
      fs.unlinkSync(loop.previewFile);
    }

    await this.prisma.loop.delete({ where: { id } });

    return { message: 'Loop deleted successfully' };
  }

  async recordListen(loopId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingListen = await this.prisma.listen.findFirst({
      where: {
        userId,
        loopId,
        listenDate: {
          gte: today,
        },
      },
    });

    if (!existingListen) {
      await this.prisma.listen.create({
        data: {
          userId,
          loopId,
          listenDate: today,
        },
      });

      await this.prisma.loop.update({
        where: { id: loopId },
        data: { listenCount: { increment: 1 } },
      });

      return { counted: true };
    }

    return { counted: false };
  }

  async getLoopsByBpm(bpm: number, excludeId?: string) {
    const tolerance = 2;
    
    const loops = await this.prisma.loop.findMany({
      where: {
        status: LoopStatus.READY,
        bpm: {
          gte: bpm - tolerance,
          lte: bpm + tolerance,
        },
        ...(excludeId && { id: { not: excludeId } }),
      },
      take: 10,
      orderBy: { downloadCount: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return loops;
  }

  async updateProcessingStatus(loopId: string, status: LoopStatus, previewFile?: string, waveformData?: any) {
    const updateData: any = { status };
    if (previewFile) updateData.previewFile = previewFile;
    if (waveformData) updateData.waveformData = waveformData;

    return this.prisma.loop.update({
      where: { id: loopId },
      data: updateData,
    });
  }
}
