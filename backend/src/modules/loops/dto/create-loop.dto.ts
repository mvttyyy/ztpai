import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateLoopDto {
  @ApiProperty({ example: 'Chill Hip-Hop Beat' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'A relaxing lo-fi hip-hop loop', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 90, description: 'Beats per minute' })
  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(300)
  bpm: number;

  @ApiProperty({ example: 'Am', description: 'Musical key', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  key?: string;

  @ApiProperty({ example: 8.5, description: 'Duration in seconds (1-60). Optional - will be detected from file.', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Duration must be a valid number' })
  @Min(1, { message: 'Loop must be at least 1 second long' })
  @Max(60, { message: 'Loop cannot exceed 60 seconds (1 minute)' })
  duration?: number;

  @ApiProperty({ example: 'Hip-Hop', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  genre?: string;

  @ApiProperty({ example: ['lofi', 'chill', 'hip-hop'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((s: string) => s.trim().toLowerCase());
        }
      } catch {}
      return value.split(',').map((s: string) => s.trim().toLowerCase());
    }
    if (Array.isArray(value)) {
      return value.map((s: string) => s.trim().toLowerCase());
    }
    return value;
  })
  tags?: string[];
}
