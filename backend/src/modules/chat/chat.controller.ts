import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Get available chat rooms' })
  @ApiResponse({ status: 200, description: 'List of rooms' })
  async getRooms() {
    return this.chatService.getRooms();
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get messages from a room' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: Date,
  ) {
    return this.chatService.getMessages(roomId, limit, before);
  }
}
