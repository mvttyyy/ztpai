import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            loops: true,
            favorites: true,
            downloads: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            loops: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        bio: true,
      },
    });
  }

  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        loops: {
          select: {
            downloadCount: true,
            listenCount: true,
            favoriteCount: true,
            averageRating: true,
          },
        },
        _count: {
          select: {
            loops: true,
            favorites: true,
            downloads: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate totals
    const totalDownloads = user.loops.reduce((sum, loop) => sum + loop.downloadCount, 0);
    const totalListens = user.loops.reduce((sum, loop) => sum + loop.listenCount, 0);
    const totalFavorites = user.loops.reduce((sum, loop) => sum + loop.favoriteCount, 0);
    const avgRating = user.loops.length > 0
      ? user.loops.reduce((sum, loop) => sum + loop.averageRating, 0) / user.loops.length
      : 0;

    return {
      loopsCount: user._count.loops,
      favoritesCount: user._count.favorites,
      downloadsCount: user._count.downloads,
      totalDownloadsReceived: totalDownloads,
      totalListensReceived: totalListens,
      totalFavoritesReceived: totalFavorites,
      averageRating: Math.round(avgRating * 10) / 10,
    };
  }

  async getUserLoops(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [loops, total] = await Promise.all([
      this.prisma.loop.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      this.prisma.loop.count({ where: { userId } }),
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

  async getUserFavorites(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          loop: {
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
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return favorites.map(fav => ({
      ...fav,
      loop: {
        ...fav.loop,
        tags: fav.loop.tags.map(lt => lt.tag),
      },
    }));
  }
}
