import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great loop! Love the vibes.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
