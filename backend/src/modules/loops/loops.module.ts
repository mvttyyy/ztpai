import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { LoopsController } from './loops.controller';
import { LoopsService } from './loops.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/originals',
        filename: (req, file, cb) => {
          const ext = file.originalname.split('.').pop();
          cb(null, `${uuidv4()}.${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/x-wav',
          'audio/ogg',
          'audio/flac',
          'audio/aiff',
          'audio/x-aiff',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only audio files are allowed.'), false);
        }
      },
    }),
  ],
  controllers: [LoopsController],
  providers: [LoopsService],
  exports: [LoopsService],
})
export class LoopsModule {}
