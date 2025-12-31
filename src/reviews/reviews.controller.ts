import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { 
  ApiBearerAuth, 
  ApiOperation, 
  ApiResponse, 
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { User, UserRole } from '../entities/user.entity';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { 
  ReviewResponseDto, 
  ReviewsListResponseDto, 
  ReviewStatsResponseDto,
  ReviewApiResponseDto
} from './dto/review-response.dto';
import {
  ErrorResponseDto,
  UnauthorizedErrorDto,
  ForbiddenErrorDto,
  ConflictErrorDto,
  BadRequestErrorDto
} from './dto/error-response.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * C1 API Contract: Create a new review
   * Request: { bookingId, tripId, rating, comment }
   * Response: { id, rating, comment, createdAt, user: { name } }
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a review',
    description: 'Create a review for a completed booking. C1 API Contract compliance. User can only review their own bookings that are completed.'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Review created successfully', 
    type: ReviewApiResponseDto 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Authentication required. Please log in to continue.',
    type: UnauthorizedErrorDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Access denied - booking not completed or not owner',
    type: ForbiddenErrorDto
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Review already exists for this booking',
    type: ConflictErrorDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation failed',
    type: BadRequestErrorDto
  })
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Request() req,
    @Body(ValidationPipe) createReviewDto: CreateReviewDto,
  ): Promise<ReviewApiResponseDto> {
    return this.reviewsService.createReview(req.user.userId, createReviewDto);
  }

  /**
   * Get all reviews with filtering and pagination
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard) // Optional auth for public viewing
  @ApiOperation({ 
    summary: 'Get reviews',
    description: 'Get all reviews with optional filtering by trip, user, or rating. Supports pagination and sorting.'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 50)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'highest_rating', 'lowest_rating'], description: 'Sort order (default: newest)' })
  @ApiQuery({ name: 'tripId', required: false, description: 'Filter by trip ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'rating', required: false, description: 'Filter by rating (1-5)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Reviews retrieved successfully', 
    type: ReviewsListResponseDto 
  })
  async getReviews(
    @Query(new ValidationPipe({ transform: true })) query: GetReviewsQueryDto,
  ): Promise<ReviewsListResponseDto> {
    return this.reviewsService.getReviews(query);
  }

  /**
  * Get review statistics
  */
  @Get('stats')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get review statistics',
    description: 'Get overall review statistics or for a specific trip.'
  })
  @ApiQuery({ name: 'tripId', required: false, description: 'Trip ID to get statistics for (optional)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Review statistics retrieved successfully', 
    type: ReviewStatsResponseDto 
  })
  async getReviewStats(
    @Query('tripId') tripId?: string,
  ): Promise<ReviewStatsResponseDto> {
    return this.reviewsService.getReviewStats(tripId);
  }

  /**
   * Check if user can review a booking
   */
  @Get('can-review/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Check if user can review',
    description: 'Check if the current user can review a specific booking.'
  })
  @ApiParam({ name: 'bookingId', description: 'Booking ID (UUID)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Review eligibility checked successfully',
    schema: {
      type: 'object',
      properties: {
        canReview: { type: 'boolean' },
        reason: { type: 'string' },
        bookingStatus: { type: 'string' },
        tripStatus: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Authentication required' 
  })
  async canUserReview(
    @Request() req,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.reviewsService.canUserReview(req.user.userId, bookingId);
  }

  /**
   * Get reviews for a specific trip
   */
  @Get('trip/:tripId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get trip reviews',
    description: 'Get all reviews for a specific trip with pagination and sorting.'
  })
  @ApiParam({ name: 'tripId', description: 'Trip ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 50)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'highest_rating', 'lowest_rating'], description: 'Sort order (default: newest)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Trip reviews retrieved successfully', 
    type: ReviewsListResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Trip not found' 
  })
  async getTripReviews(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Query(new ValidationPipe({ transform: true })) query: GetReviewsQueryDto,
  ): Promise<ReviewsListResponseDto> {
    return this.reviewsService.getTripReviews(tripId, query);
  }

  /**
   * Get reviews by a specific user
   */
  @Get('user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get user reviews',
    description: 'Get all reviews by a specific user with pagination and sorting.'
  })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 50)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'highest_rating', 'lowest_rating'], description: 'Sort order (default: newest)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User reviews retrieved successfully', 
    type: ReviewsListResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'User not found' 
  })
  async getUserReviews(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query(new ValidationPipe({ transform: true })) query: GetReviewsQueryDto,
  ): Promise<ReviewsListResponseDto> {
    return this.reviewsService.getUserReviews(userId, query);
  }

  /**
   * Get current user's reviews
   */
  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get my reviews',
    description: 'Get all reviews by the currently authenticated user.'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 50)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'highest_rating', 'lowest_rating'], description: 'Sort order (default: newest)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User reviews retrieved successfully', 
    type: ReviewsListResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Authentication required' 
  })
  async getMyReviews(
    @Request() req,
    @Query(new ValidationPipe({ transform: true })) query: GetReviewsQueryDto,
  ): Promise<ReviewsListResponseDto> {
    return this.reviewsService.getUserReviews(req.user.userId, query);
  }

  /**
   * Get a specific review by ID
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get review by ID',
    description: 'Get a specific review by its ID.'
  })
  @ApiParam({ name: 'id', description: 'Review ID (UUID)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Review retrieved successfully', 
    type: ReviewResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Review not found' 
  })
  async getReviewById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.getReviewById(id);
  }

  /**
   * Update a review (only by owner)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update a review',
    description: 'Update a review. Only the review owner can update their review.'
  })
  @ApiParam({ name: 'id', description: 'Review ID (UUID)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Review updated successfully', 
    type: ReviewResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Review not found or does not belong to user' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Authentication required' 
  })
  async updateReview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.updateReview(req.user.userId, id, updateReviewDto);
  }

  /**
   * Delete a review (only by owner)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete a review',
    description: 'Delete a review. Only the review owner can delete their review.'
  })
  @ApiParam({ name: 'id', description: 'Review ID (UUID)' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Review deleted successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Review not found or does not belong to user' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Authentication required' 
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.reviewsService.deleteReview(req.user.userId, id);
  }

  /**
   * Admin: Delete any review
   */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Admin: Delete any review',
    description: 'Delete any review. Admin only endpoint.'
  })
  @ApiParam({ name: 'id', description: 'Review ID (UUID)' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Review deleted successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Review not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Authentication required' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Admin access required' 
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async adminDeleteReview(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.reviewsService.deleteReview(req.user.userId, id, true);
  }
}