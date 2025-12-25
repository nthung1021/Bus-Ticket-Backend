import { ApiProperty } from '@nestjs/swagger';

/**
 * C1 API Contract: Standardized error response format
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Booking not found or does not belong to you'
  })
  message: string | string[];

  @ApiProperty({
    description: 'Error type/code for client handling',
    example: 'BOOKING_NOT_FOUND'
  })
  error: string;

  @ApiProperty({
    description: 'Request timestamp',
    example: '2024-12-21T10:00:00Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/reviews'
  })
  path: string;
}

/**
 * C1 API Contract: 401 Unauthorized Error
 */
export class UnauthorizedErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode: number = 401;

  @ApiProperty({ example: 'Authentication required. Please log in to continue.' })
  message: string = 'Authentication required. Please log in to continue.';

  @ApiProperty({ example: 'UNAUTHORIZED' })
  error: string = 'UNAUTHORIZED';
}

/**
 * C1 API Contract: 403 Forbidden Error
 */
export class ForbiddenErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: 403 })
  statusCode: number = 403;

  @ApiProperty({ 
    example: 'Access denied',
    description: 'Can be "Booking not completed" or "Booking does not belong to you"'
  })
  message: string = 'Access denied';

  @ApiProperty({ 
    example: 'FORBIDDEN',
    enum: ['BOOKING_NOT_COMPLETED', 'BOOKING_NOT_OWNER', 'FORBIDDEN']
  })
  error: string = 'FORBIDDEN';
}

/**
 * C1 API Contract: 409 Conflict Error
 */
export class ConflictErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode: number = 409;

  @ApiProperty({ example: 'Review already exists for this booking. Each booking can only have one review.' })
  message: string = 'Review already exists for this booking. Each booking can only have one review.';

  @ApiProperty({ example: 'REVIEW_ALREADY_EXISTS' })
  error: string = 'REVIEW_ALREADY_EXISTS';
}

/**
 * C1 API Contract: 400 Bad Request Error
 */
export class BadRequestErrorDto extends ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number = 400;

  @ApiProperty({ 
    example: 'Validation failed',
    description: 'Can include validation errors for rating, comment, etc.'
  })
  message: string | string[] = 'Validation failed';

  @ApiProperty({ example: 'BAD_REQUEST' })
  error: string = 'BAD_REQUEST';
}