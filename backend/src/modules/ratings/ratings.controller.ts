import { Controller, Post, Delete, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RateLoopDto } from './dto/rate-loop.dto';

@ApiTags('Ratings')
@Controller('loops/:loopId/ratings')
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Rate a loop (1-5 stars)' })
  @ApiResponse({ status: 200, description: 'Rating saved' })
  async rate(
    @Param('loopId') loopId: string,
    @CurrentUser() user: any,
    @Body() dto: RateLoopDto,
  ) {
    return this.ratingsService.rate(user.id, loopId, dto.value);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove rating from a loop' })
  @ApiResponse({ status: 200, description: 'Rating removed' })
  async remove(
    @Param('loopId') loopId: string,
    @CurrentUser() user: any,
  ) {
    return this.ratingsService.remove(user.id, loopId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user rating for a loop' })
  @ApiResponse({ status: 200, description: 'User rating' })
  async getMyRating(
    @Param('loopId') loopId: string,
    @CurrentUser() user: any,
  ) {
    return this.ratingsService.getUserRating(user.id, loopId);
  }
}
