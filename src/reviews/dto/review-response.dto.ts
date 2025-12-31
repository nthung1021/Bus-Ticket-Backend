import { ApiProperty } from '@nestjs/swagger';

// C1 API Contract: Simplified response format for FE integration
export class ReviewApiResponseDto {
  @ApiProperty({
    description: 'Review ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  id: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 5
  })
  rating: number;

  @ApiProperty({
    description: 'Review comment',
    example: 'Great service and comfortable ride!',
    nullable: true
  })
  comment: string | null;

  @ApiProperty({
    description: 'Review creation date',
    example: '2024-12-21T10:00:00Z'
  })
  createdAt: string; // ISO string format for FE

  @ApiProperty({
    description: 'User details',
    type: 'object',
    properties: {
      name: { type: 'string' }
    }
  })
  user: {
    name: string;
  };
}

// List item response format (matches frontend ReviewWithUser interface)
export class ReviewListItemDto {
  @ApiProperty({
    description: 'Review ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  id: string;

  @ApiProperty({
    description: 'Trip ID being reviewed',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  tripId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 4
  })
  rating: number;

  @ApiProperty({
    description: 'Review comment',
    example: 'Great service and comfortable ride!',
    nullable: true
  })
  comment: string | null;

  @ApiProperty({
    description: 'Review creation date',
    example: '2024-12-21T10:00:00Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'User details',
    type: 'object',
    properties: {
      name: { type: 'string' }
    }
  })
  user: {
    name: string;
  };
}

// Detailed response format for admin/internal use
export class ReviewResponseDto {
  @ApiProperty({
    description: 'Review ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  id: string;

  @ApiProperty({
    description: 'User ID who created the review',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  userId: string;

  @ApiProperty({
    description: 'Trip ID being reviewed',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  tripId: string;

  @ApiProperty({
    description: 'Booking ID for the review',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  })
  bookingId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 4
  })
  rating: number;

  @ApiProperty({
    description: 'Review comment',
    example: 'Great service and comfortable ride!',
    nullable: true
  })
  comment: string | null;

  @ApiProperty({
    description: 'Review creation date',
    example: '2024-12-21T10:00:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User details',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' }
    }
  })
  user?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Trip details',
    type: 'object',
    nullable: true,
    additionalProperties: true
  })
  trip?: any;

  @ApiProperty({
    description: 'Booking details',
    type: 'object',
    nullable: true,
    additionalProperties: true
  })
  booking?: any;
}

export class ReviewsListResponseDto {
  @ApiProperty({
    description: 'List of reviews',
    type: [ReviewListItemDto]
  })
  reviews: ReviewListItemDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: 'object',
    properties: {
      total: { type: 'number', description: 'Total number of reviews' },
      page: { type: 'number', description: 'Current page number' },
      limit: { type: 'number', description: 'Number of reviews per page' },
      totalPages: { type: 'number', description: 'Total number of pages' },
      hasNext: { type: 'boolean', description: 'Whether there are more pages' },
      hasPrev: { type: 'boolean', description: 'Whether there are previous pages' }
    }
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ReviewStatsResponseDto {
  @ApiProperty({
    description: 'Total number of reviews',
    example: 150
  })
  totalReviews: number;

  @ApiProperty({
    description: 'Average rating',
    example: 4.2
  })
  averageRating: number;

  @ApiProperty({
    description: 'Rating distribution by stars',
    type: 'object',
    additionalProperties: true,
    example: {
      '1': 5,
      '2': 10,
      '3': 25,
      '4': 60,
      '5': 50
    }
  })
  ratingDistribution: { [key: number]: number };
}