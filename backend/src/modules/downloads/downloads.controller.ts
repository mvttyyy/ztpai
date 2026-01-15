import { Controller, Post, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { DownloadsService } from './downloads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Downloads')
@Controller('downloads')
export class DownloadsController {
  constructor(private downloadsService: DownloadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user downloads history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of downloaded loops' })
  async getUserDownloads(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.downloadsService.getUserDownloads(user.id, page, limit);
  }

  @Post(':loopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Record download and return file info' })
  @ApiResponse({ status: 200, description: 'Download recorded, returns file URL' })
  async download(
    @Param('loopId') loopId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    const result = await this.downloadsService.download(user.id, loopId, ipAddress);

    // Return download info - frontend will fetch file from /uploads/
    return {
      success: true,
      fileName: result.fileName,
      fileUrl: result.originalFile,
      certificate: result.certificate,
    };
  }

  @Get('certificate/:hash')
  @ApiOperation({ summary: 'Verify a download certificate' })
  @ApiResponse({ status: 200, description: 'Certificate verification result' })
  async verifyCertificate(@Param('hash') hash: string) {
    return this.downloadsService.verifyCertificate(hash);
  }
}
