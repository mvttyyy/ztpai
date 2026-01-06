import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LoopsService } from './loops.service';
import { CreateLoopDto } from './dto/create-loop.dto';
import { UpdateLoopDto } from './dto/update-loop.dto';
import { FilterLoopsDto, SortField, SortOrder } from './dto/filter-loops.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Loops')
@Controller('loops')
export class LoopsController {
  constructor(private loopsService: LoopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload a new loop' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        bpm: { type: 'number' },
        key: { type: 'string' },
        duration: { type: 'number' },
        genre: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Loop uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or data' })
  async create(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateLoopDto,
  ) {
    return this.loopsService.create(user.id, dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all loops with filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'bpmMin', required: false, type: Number })
  @ApiQuery({ name: 'bpmMax', required: false, type: Number })
  @ApiQuery({ name: 'key', required: false })
  @ApiQuery({ name: 'genre', required: false })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'sortBy', required: false, enum: SortField })
  @ApiQuery({ name: 'sortOrder', required: false, enum: SortOrder })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of loops' })
  async findAll(@Query() filters: FilterLoopsDto) {
    return this.loopsService.findAll(filters);
  }

  @Get('by-bpm/:bpm')
  @ApiOperation({ summary: 'Get loops by BPM (for multi-play feature)' })
  @ApiQuery({ name: 'excludeId', required: false })
  @ApiResponse({ status: 200, description: 'List of loops with similar BPM' })
  async getByBpm(
    @Param('bpm') bpm: number,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.loopsService.getLoopsByBpm(bpm, excludeId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get loop by ID' })
  @ApiResponse({ status: 200, description: 'Loop details' })
  @ApiResponse({ status: 404, description: 'Loop not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.loopsService.findById(id, user?.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update loop' })
  @ApiResponse({ status: 200, description: 'Loop updated' })
  @ApiResponse({ status: 404, description: 'Loop not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateLoopDto,
  ) {
    return this.loopsService.update(id, user.id, dto, user.role === 'ADMIN');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete loop' })
  @ApiResponse({ status: 200, description: 'Loop deleted' })
  @ApiResponse({ status: 404, description: 'Loop not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.loopsService.delete(id, user.id, user.role === 'ADMIN');
  }

  @Post(':id/listen')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Record a listen for the loop' })
  @ApiResponse({ status: 200, description: 'Listen recorded' })
  async recordListen(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.loopsService.recordListen(id, user.id);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream loop preview (supports Range requests)' })
  @ApiResponse({ status: 200, description: 'Audio stream' })
  @ApiResponse({ status: 206, description: 'Partial audio content' })
  async streamPreview(
    @Param('id') id: string,
    @Headers('range') range: string,
    @Res() res: Response,
  ) {
    const loop = await this.loopsService.findById(id);
    const filePath = loop.previewFile || loop.originalFile;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Audio file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.mp3' ? 'audio/mpeg' : ext === '.ogg' ? 'audio/ogg' : 'audio/wav';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }
}
