import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createMessage(userId: string, roomId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: {
        content,
        userId,
        roomId,
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
  }

  async getMessages(roomId: string, limit = 50, before?: Date) {
    return this.prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(before && { createdAt: { lt: before } }),
      },
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
      },
    });
  }

  async getRooms() {
    const rooms = await this.prisma.chatMessage.groupBy({
      by: ['roomId'],
      _count: { id: true },
    });

    return rooms.map(r => ({
      id: r.roomId,
      messageCount: r._count.id,
    }));
  }
}
