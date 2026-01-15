import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  // Helper to find loop by ID or slug and return the actual ID
  private async resolveLoopId(idOrSlug: string): Promise<string> {
    // First try to find by slug
    let loop = await this.prisma.loop.findUnique({ 
      where: { slug: idOrSlug },
      select: { id: true }
    });
    
    // If not found by slug and looks like a UUID, try by id
    if (!loop && UUID_REGEX.test(idOrSlug)) {
      loop = await this.prisma.loop.findUnique({ 
        where: { id: idOrSlug },
        select: { id: true }
      });
    }
    
    if (!loop) {
      throw new NotFoundException('Loop not found');
    }
    
    return loop.id;
  }

  async add(userId: string, loopIdOrSlug: string) {
    // Verify loop exists and get actual ID
    const loopId = await this.resolveLoopId(loopIdOrSlug);

    // Check if already favorited
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_loopId: { userId, loopId },
      },
    });

    if (existing) {
      throw new ConflictException('Loop already in favorites');
    }

    // Add favorite
    const favorite = await this.prisma.favorite.create({
      data: { userId, loopId },
    });

    // Increment favorite count
    await this.prisma.loop.update({
      where: { id: loopId },
      data: { favoriteCount: { increment: 1 } },
    });

    return favorite;
  }

  async remove(userId: string, loopIdOrSlug: string) {
    const loopId = await this.resolveLoopId(loopIdOrSlug);
    
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_loopId: { userId, loopId },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: { id: favorite.id },
    });

    // Decrement favorite count
    await this.prisma.loop.update({
      where: { id: loopId },
      data: { favoriteCount: { decrement: 1 } },
    });

    return { message: 'Removed from favorites' };
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
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      data: favorites.map(f => ({
        ...f.loop,
        tags: f.loop.tags.map(lt => lt.tag),
        favoritedAt: f.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async isFavorited(userId: string, loopIdOrSlug: string) {
    const loopId = await this.resolveLoopId(loopIdOrSlug);
    
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_loopId: { userId, loopId },
      },
    });
    return { isFavorite: !!favorite, isFavorited: !!favorite };
  }
}
