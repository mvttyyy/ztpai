import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RabbitMQService, QUEUES } from '../../rabbitmq/rabbitmq.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RatingsService {
  constructor(
    private prisma: PrismaService,
    private rabbitMQ: RabbitMQService,
  ) {}

  private async resolveLoopId(idOrSlug: string): Promise<{ id: string; userId: string; title: string }> {
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

  async rate(userId: string, loopIdOrSlug: string, value: number) {
    const loop = await this.resolveLoopId(loopIdOrSlug);
    const loopId = loop.id;

    const rating = await this.prisma.rating.upsert({
      where: {
        userId_loopId: { userId, loopId },
      },
      update: { value },
      create: { userId, loopId, value },
    });

    const stats = await this.prisma.rating.aggregate({
      where: { loopId },
      _avg: { value: true },
      _count: { value: true },
    });

    await this.prisma.loop.update({
      where: { id: loopId },
      data: {
        averageRating: stats._avg.value || 0,
        ratingCount: stats._count.value,
      },
    });

    if (loop.userId !== userId) {
      await this.rabbitMQ.publish(QUEUES.NOTIFICATIONS, {
        type: 'NEW_RATING',
        userId: loop.userId,
        data: {
          loopId,
          loopTitle: loop.title,
          rating: value,
        },
      });
    }

    return rating;
  }

  async remove(userId: string, loopIdOrSlug: string) {
    const loop = await this.resolveLoopId(loopIdOrSlug);
    const loopId = loop.id;
    
    const rating = await this.prisma.rating.findUnique({
      where: {
        userId_loopId: { userId, loopId },
      },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    await this.prisma.rating.delete({
      where: { id: rating.id },
    });

    const stats = await this.prisma.rating.aggregate({
      where: { loopId },
      _avg: { value: true },
      _count: { value: true },
    });

    await this.prisma.loop.update({
      where: { id: loopId },
      data: {
        averageRating: stats._avg.value || 0,
        ratingCount: stats._count.value,
      },
    });

    return { message: 'Rating removed' };
  }

  async getUserRating(userId: string, loopIdOrSlug: string) {
    const loop = await this.resolveLoopId(loopIdOrSlug);
    
    return this.prisma.rating.findUnique({
      where: {
        userId_loopId: { userId, loopId: loop.id },
      },
    });
  }
}
