import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min, Max } from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({
    description: 'Updated rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 5,
    required: false
  })
  @IsOptional()
  @IsInt({ message: 'Rating must be an integer' })
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating must be at most 5 stars' })
  rating?: number;

  @ApiProperty({
    description: 'Updated review comment',
    required: false,
    example: 'Updated: Excellent service, highly recommend!'
  })
  @IsOptional()
  @IsString({ message: 'Comment must be a string' })
  comment?: string;
}