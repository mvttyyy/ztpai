import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RabbitMQService, QUEUES } from '../../rabbitmq/rabbitmq.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DownloadCertificate {
  certificateHash: string;
  loopTitle: string;
  loopId: string;
  fileHash: string;
  username: string;
  downloadedAt: string;
  license: string;
}

@Injectable()
export class DownloadsService {
  constructor(
    private prisma: PrismaService,
    private rabbitMQ: RabbitMQService,
  ) {}

  // Helper to find loop by ID or slug
  private async findLoopByIdOrSlug(idOrSlug: string) {
    // Try slug first
    let loop = await this.prisma.loop.findUnique({
      where: { slug: idOrSlug },
      include: {
        user: {
          select: { username: true },
        },
      },
    });
    
    // Fallback to ID only if it looks like a valid UUID
    if (!loop && UUID_REGEX.test(idOrSlug)) {
      loop = await this.prisma.loop.findUnique({
        where: { id: idOrSlug },
        include: {
          user: {
            select: { username: true },
          },
        },
      });
    }
    
    return loop;
  }

  async download(userId: string, loopIdOrSlug: string, ipAddress?: string) {
    // Verify loop exists
    const loop = await this.findLoopByIdOrSlug(loopIdOrSlug);

    if (!loop) {
      throw new NotFoundException('Loop not found');
    }

    const loopId = loop.id;

    // Resolve full file path (database stores relative paths like 'originals/uuid.mp3')
    const fullFilePath = path.resolve('/app/uploads', loop.originalFile);

    // Verify file exists
    if (!fs.existsSync(fullFilePath)) {
      console.error(`Download failed: File not found at ${fullFilePath} for loop ${loop.title}`);
      throw new NotFoundException(`Audio file not found. This loop may be a demo sample without an actual file.`);
    }

    // Get downloading user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    // Generate certificate hash (certified download proof)
    const timestamp = new Date().toISOString();
    const certificateData = `${loopId}:${userId}:${loop.fileHash}:${timestamp}`;
    const certificateHash = crypto.createHash('sha256').update(certificateData).digest('hex');

    // Check if this user has already downloaded this loop
    const existingDownload = await this.prisma.download.findFirst({
      where: {
        userId,
        loopId,
      },
    });

    // Record download
    const download = await this.prisma.download.create({
      data: {
        userId,
        loopId,
        certificateHash,
        ipAddress,
      },
    });

    // Increment download count only if this is the first download by this user
    if (!existingDownload) {
      await this.prisma.loop.update({
        where: { id: loopId },
        data: { downloadCount: { increment: 1 } },
      });
    }

    // Send notification to loop owner
    if (loop.userId !== userId) {
      await this.rabbitMQ.publish(QUEUES.NOTIFICATIONS, {
        type: 'NEW_DOWNLOAD',
        userId: loop.userId,
        data: {
          loopId,
          loopTitle: loop.title,
          downloaderUsername: user?.username,
        },
      });
    }

    // Create certificate
    const certificate: DownloadCertificate = {
      certificateHash,
      loopTitle: loop.title,
      loopId: loop.id,
      fileHash: loop.fileHash || 'N/A',
      username: user?.username || 'Unknown',
      downloadedAt: timestamp,
      license: 'Free to use / No attribution required. Redistribution of unmodified files is prohibited.',
    };

    return {
      filePath: fullFilePath,
      originalFile: loop.originalFile,
      fileName: `${loop.title.replace(/[^a-zA-Z0-9]/g, '_')}.${loop.originalFile.split('.').pop()}`,
      certificate,
    };
  }

  async getUserDownloads(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [downloads, total] = await Promise.all([
      this.prisma.download.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          loop: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.download.count({ where: { userId } }),
    ]);

    return {
      data: downloads.map(d => ({
        ...d.loop,
        downloadedAt: d.createdAt,
        certificateHash: d.certificateHash,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async verifyCertificate(certificateHash: string) {
    const download = await this.prisma.download.findFirst({
      where: { certificateHash },
      include: {
        loop: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!download) {
      return { valid: false, message: 'Certificate not found' };
    }

    return {
      valid: true,
      certificate: {
        loopTitle: download.loop.title,
        loopId: download.loopId,
        fileHash: download.loop.fileHash,
        username: download.user.username,
        downloadedAt: download.createdAt,
        license: 'Free to use / No attribution required. Redistribution of unmodified files is prohibited.',
      },
    };
  }
}
