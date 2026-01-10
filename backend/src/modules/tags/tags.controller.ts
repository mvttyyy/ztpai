import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiResponse({ status: 200, description: 'List of all tags' })
  async findAll() {
    return this.tagsService.findAll();
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular tags' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of popular tags with loop count' })
  async findPopular(@Query('limit') limit?: number) {
    return this.tagsService.findPopular(limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search tags' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query('q') query: string) {
    return this.tagsService.search(query);
  }
}
