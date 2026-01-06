import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class RateLoopDto {
  @ApiProperty({ example: 5, description: 'Rating value (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  value: number;
}
