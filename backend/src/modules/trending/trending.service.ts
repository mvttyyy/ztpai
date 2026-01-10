import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoopStatus } from '@prisma/client';

@Injectable()
export class TrendingService {
  constructor(private prisma: PrismaService) {}

  async getTrending(limit = 10) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const downloadCounts = await this.prisma.download.groupBy({
      by: ['loopId'],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    const listenCounts = await this.prisma.listen.groupBy({
      by: ['loopId'],
      where: {
        listenDate: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    const scores = new Map<string, number>();

    downloadCounts.forEach(d => {
      scores.set(d.loopId, (scores.get(d.loopId) || 0) + d._count.id * 2);
    });

    listenCounts.forEach(l => {
      scores.set(l.loopId, (scores.get(l.loopId) || 0) + l._count.id);
    });

    const sortedLoopIds = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([loopId]) => loopId);

    if (sortedLoopIds.length === 0) {
      const loops = await this.prisma.loop.findMany({
        where: { status: LoopStatus.READY },
        orderBy: { downloadCount: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          tags: {
            include: { tag: true },
          },
        },
      });

      return loops.map(loop => ({
        ...loop,
        tags: loop.tags.map(lt => lt.tag),
        trendingScore: loop.downloadCount * 2 + loop.listenCount,
      }));
    }

    const loops = await this.prisma.loop.findMany({
      where: {
        id: { in: sortedLoopIds },
        status: LoopStatus.READY,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    return sortedLoopIds
      .map(id => loops.find(l => l.id === id))
      .filter(Boolean)
      .map(loop => ({
        ...loop,
        tags: loop!.tags.map(lt => lt.tag),
        trendingScore: scores.get(loop!.id) || 0,
      }));
  }

  async getRecentlyAdded(limit = 10) {
    const loops = await this.prisma.loop.findMany({
      where: { status: LoopStatus.READY },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    return loops.map(loop => ({
      ...loop,
      tags: loop.tags.map(lt => lt.tag),
    }));
  }

  async getTopRated(limit = 10) {
    const loops = await this.prisma.loop.findMany({
      where: {
        status: LoopStatus.READY,
        ratingCount: { gte: 3 },
      },
      orderBy: { averageRating: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    return loops.map(loop => ({
      ...loop,
      tags: loop.tags.map(lt => lt.tag),
    }));
  }
}
