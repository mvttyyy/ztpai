import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, LoopStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalLoops,
      totalDownloads,
      pendingLoops,
      recentUsers,
      recentLoops,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.loop.count(),
      this.prisma.download.count(),
      this.prisma.loop.count({ where: { status: LoopStatus.PENDING } }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      }),
      this.prisma.loop.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { username: true },
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalLoops,
      totalDownloads,
      pendingLoops,
      recentUsers,
      recentLoops,
    };
  }

  async getAllUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              loops: true,
              downloads: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
  }

  async toggleUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user?.isActive },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    });
  }

  async getAllLoops(page = 1, limit = 20, status?: LoopStatus) {
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [loops, total] = await Promise.all([
      this.prisma.loop.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.loop.count({ where }),
    ]);

    return {
      data: loops,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateLoopStatus(loopId: string, status: LoopStatus) {
    return this.prisma.loop.update({
      where: { id: loopId },
      data: { status },
    });
  }

  async deleteLoop(loopId: string) {
    return this.prisma.loop.delete({
      where: { id: loopId },
    });
  }

  async deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
