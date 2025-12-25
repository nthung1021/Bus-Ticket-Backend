import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsIn, IsUUID } from 'class-validator';

export class GetReviewsQueryDto {
  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    minimum: 1,
    default: 1,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of reviews per page',
    required: false,
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Sort order for reviews',
    required: false,
    enum: ['newest', 'oldest', 'highest_rating', 'lowest_rating'],
    default: 'newest',
    example: 'newest'
  })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'highest_rating', 'lowest_rating'], {
    message: 'Sort must be one of: newest, oldest, highest_rating, lowest_rating'
  })
  sortBy?: 'newest' | 'oldest' | 'highest_rating' | 'lowest_rating' = 'newest';

  @ApiProperty({
    description: 'Filter by specific trip ID',
    required: false,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @IsOptional()
  @IsUUID('4', { message: 'Trip ID must be a valid UUID' })
  tripId?: string;

  @ApiProperty({
    description: 'Filter by specific user ID',
    required: false,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @IsOptional()
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId?: string;

  @ApiProperty({
    description: 'Filter by rating',
    required: false,
    minimum: 1,
    maximum: 5,
    example: 5
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rating must be an integer' })
  @Min(1, { message: 'Rating must be at least 1' })
  rating?: number;
}