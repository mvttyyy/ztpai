import { Controller, Post, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user favorites' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of favorited loops' })
  async getUserFavorites(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.favoritesService.getUserFavorites(user.id, page, limit);
  }

  @Post(':loopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add loop to favorites' })
  @ApiResponse({ status: 201, description: 'Added to favorites' })
  @ApiResponse({ status: 409, description: 'Already in favorites' })
  async add(
    @Param('loopId') loopId: string,
    @CurrentUser() user: any,
  ) {
    return this.favoritesService.add(user.id, loopId);
  }

  @Delete(':loopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove loop from favorites' })
  @ApiResponse({ status: 200, description: 'Removed from favorites' })
  async remove(
    @Param('loopId') loopId: string,
    @CurrentUser() user: any,
  ) {
    return this.favoritesService.remove(user.id, loopId);
  }

  @Get(':loopId/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if loop is favorited' })
  @ApiResponse({ status: 200, description: 'Favorite status' })
  async isFavorited(
    @Param('loopId') loopId: string,
    @CurrentUser() user: any,
  ) {
    return this.favoritesService.isFavorited(user.id, loopId);
  }
}
