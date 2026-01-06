import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RabbitMQService, QUEUES } from '../../rabbitmq/rabbitmq.service';
import { CreateCommentDto } from './dto/create-comment.dto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private rabbitMQ: RabbitMQService,
  ) {}

  private async resolveLoop(idOrSlug: string): Promise<{ id: string; userId: string; title: string }> {
    let loop = await this.prisma.loop.findUnique({ 
      where: { slug: idOrSlug },
      select: { id: true, userId: true, title: true }
    });
    
    if (!loop && UUID_REGEX.test(idOrSlug)) {
      loop = await this.prisma.loop.findUnique({ 
        where: { id: idOrSlug },
        select: { id: true, userId: true, title: true }
      });
    }
    
    if (!loop) {
      throw new NotFoundException('Loop not found');
    }
    
    return loop;
  }

  async create(userId: string, loopIdOrSlug: string, dto: CreateCommentDto) {
    const loop = await this.resolveLoop(loopIdOrSlug);
    const loopId = loop.id;

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        userId,
        loopId,
      },
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

    if (loop.userId !== userId) {
      await this.rabbitMQ.publish(QUEUES.NOTIFICATIONS, {
        type: 'NEW_COMMENT',
        userId: loop.userId,
        data: {
          loopId,
          loopTitle: loop.title,
          commentId: comment.id,
          commenterUsername: comment.user.username,
        },
      });
    }

    return comment;
  }

  async findByLoopId(loopIdOrSlug: string, page = 1, limit = 20) {
    const loop = await this.resolveLoop(loopIdOrSlug);
    const loopId = loop.id;
    
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { loopId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.comment.count({ where: { loopId } }),
    ]);

    return {
      data: comments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async delete(commentId: string, userId: string, isAdmin = false) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId && !isAdmin) {
      throw new BadRequestException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    return { message: 'Comment deleted' };
  }
}
