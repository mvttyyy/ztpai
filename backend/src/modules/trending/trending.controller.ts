import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TrendingService } from './trending.service';

@ApiTags('Trending')
@Controller('trending')
export class TrendingController {
  constructor(private trendingService: TrendingService) {}

  @Get()
  @ApiOperation({ summary: 'Get trending loops (last 7 days)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of trending loops' })
  async getTrending(@Query('limit') limit?: number) {
    return this.trendingService.getTrending(limit);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently added loops' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of recent loops' })
  async getRecent(@Query('limit') limit?: number) {
    return this.trendingService.getRecentlyAdded(limit);
  }

  @Get('top-rated')
  @ApiOperation({ summary: 'Get top rated loops' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of top rated loops' })
  async getTopRated(@Query('limit') limit?: number) {
    return this.trendingService.getTopRated(limit);
  }
}
