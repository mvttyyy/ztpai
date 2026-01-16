import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoopStatus } from '@prisma/client';

@Injectable()
export class TrendingService {
  constructor(private prisma: PrismaService) {}

  async getTrending(limit = 10) {
    // Get trending loops from last 7 days
    // Score = downloads * 2 + unique listens
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get download counts per loop in last 7 days
    const downloadCounts = await this.prisma.download.groupBy({
      by: ['loopId'],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    // Get unique listen counts per loop in last 7 days
    const listenCounts = await this.prisma.listen.groupBy({
      by: ['loopId'],
      where: {
        listenDate: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    // Calculate scores
    const scores = new Map<string, number>();

    downloadCounts.forEach(d => {
      scores.set(d.loopId, (scores.get(d.loopId) || 0) + d._count.id * 2);
    });

    listenCounts.forEach(l => {
      scores.set(l.loopId, (scores.get(l.loopId) || 0) + l._count.id);
    });

    // Sort by score
    const sortedLoopIds = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([loopId]) => loopId);

    if (sortedLoopIds.length === 0) {
      // Fall back to most downloaded overall
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

    // Get loop details
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

    // Sort loops by their score and add score to response
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
        ratingCount: { gte: 3 }, // At least 3 ratings
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
