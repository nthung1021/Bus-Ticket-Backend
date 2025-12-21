import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min, Max, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Booking ID for the review',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  @IsUUID('4', { message: 'Booking ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Booking ID is required' })
  bookingId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 4
  })
  @IsInt({ message: 'Rating must be an integer' })
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating must be at most 5 stars' })
  rating: number;

  @ApiProperty({
    description: 'Optional review comment',
    required: false,
    example: 'Great service and comfortable ride!'
  })
  @IsOptional()
  @IsString({ message: 'Comment must be a string' })
  comment?: string;
}