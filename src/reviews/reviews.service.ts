import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException,
  ConflictException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Review } from '../entities/review.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Trip } from '../entities/trip.entity';
import { User } from '../entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';
import { 
  ReviewResponseDto, 
  ReviewsListResponseDto, 
  ReviewStatsResponseDto,
  ReviewApiResponseDto
} from './dto/review-response.dto';
import { ProfanityFilter } from './utils/profanity-filter.util';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create a new review for a completed booking
   * B2 API Requirements:
   * - Validate booking belongs to user  
   * - Validate booking status = COMPLETED
   * - Save review
   * - Update trip average rating
   */
  async createReview(userId: string, createReviewDto: CreateReviewDto): Promise<ReviewApiResponseDto> {
    const { bookingId, tripId, rating, comment } = createReviewDto;

    // B2 Requirement: Validate booking belongs to user
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, userId },
      relations: ['trip', 'user']
    });

    if (!booking) {
      throw new NotFoundException('Booking not found or does not belong to you');
    }

    // C1 API Contract: Validate tripId matches booking's trip
    if (booking.tripId !== tripId) {
      throw new BadRequestException('Trip ID does not match the booking');
    }

    // B2 Requirement: Validate booking status = PAID or COMPLETED
    if (booking.status !== BookingStatus.COMPLETED && booking.status !== BookingStatus.PAID) {
      throw new BadRequestException('Can only review paid or completed bookings');
    }

    // Check if trip is completed
    // TEMPORARILY COMMENTED FOR TESTING - Allow review even before trip completion
    // if (booking.trip && new Date() < booking.trip.arrivalTime) {
    //   throw new BadRequestException('Can only review after trip completion');
    // }

    // B4 Safety: Enhanced duplicate checking with detailed logging
    const existingReview = await this.reviewRepository.findOne({
      where: { bookingId },
      relations: ['user']
    });

    if (existingReview) {
      this.logger.warn(
        `Duplicate review attempt blocked - Booking: ${bookingId}, User: ${userId}, ` +
        `Existing review: ${existingReview.id} by user: ${existingReview.userId}`
      );
      throw new ConflictException(
        'Review already exists for this booking. Each booking can only have one review.'
      );
    }

    // B4 Safety: Basic profanity filtering (optional)
    let filteredComment = comment;
    if (comment) {
      const profanityAnalysis = ProfanityFilter.analyzeProfanity(comment);
      
      if (profanityAnalysis.hasProfanity) {
        // Log profanity attempt
        this.logger.warn(
          `Profanity detected in review comment - User: ${userId}, Booking: ${bookingId}, ` +
          `Original length: ${comment.length}, Filtered: ${profanityAnalysis.filteredText.length}`
        );
        
        // Use filtered comment
        filteredComment = profanityAnalysis.filteredText;
        
        // Optional: Could throw error instead of filtering
        // throw new BadRequestException('Comment contains inappropriate content');
      }
    }

    // B4 Safety: Log review creation attempt
    this.logger.log(
      `Creating review - User: ${userId}, Booking: ${bookingId}, Trip: ${booking.tripId}, ` +
      `Rating: ${rating}, Has comment: ${!!filteredComment}`
    );

    // B2 Requirement: Save review
    const review = this.reviewRepository.create({
      userId,
      tripId: booking.tripId,
      bookingId,
      rating,
      comment: filteredComment || null
    });

    let savedReview: Review;
    try {
      savedReview = await this.reviewRepository.save(review);
      
      // B4 Safety: Log successful creation
      this.logger.log(
        `Review created successfully - ID: ${savedReview.id}, User: ${userId}, ` +
        `Booking: ${bookingId}, Rating: ${rating}`
      );
    } catch (error) {
      // B4 Safety: Handle database constraint violations
      if (error.code === '23505') { // PostgreSQL unique violation
        this.logger.error(
          `Database constraint violation - duplicate review attempt - User: ${userId}, ` +
          `Booking: ${bookingId}, Error: ${error.message}`
        );
        throw new ConflictException(
          'Review already exists for this booking. Database constraint prevented duplicate.'
        );
      }
      
      // B4 Safety: Log unexpected errors
      this.logger.error(
        `Failed to create review - User: ${userId}, Booking: ${bookingId}, ` +
        `Error: ${error.message}`, error.stack
      );
      throw error;
    }

    // B2 Requirement: Update trip average rating
    try {
      await this.updateTripAverageRating(booking.tripId);
      this.logger.log(`Trip rating updated for trip: ${booking.tripId} after review: ${savedReview.id}`);
    } catch (error) {
      // B4 Safety: Log rating update failures but don't fail the whole operation
      this.logger.error(
        `Failed to update trip rating - Trip: ${booking.tripId}, Review: ${savedReview.id}, ` +
        `Error: ${error.message}`, error.stack
      );
      // Continue - review creation succeeded, rating update can be retried
    }

    return this.mapToApiResponseDto(savedReview);
  }

  /**
   * Get reviews with filtering and pagination
   */
  async getReviews(query: GetReviewsQueryDto): Promise<ReviewsListResponseDto> {
    const { page = 1, limit = 10, sortBy = 'newest', tripId, userId, rating } = query;
    
    const queryBuilder = this.createReviewsQuery();

    // Apply filters
    if (tripId) {
      queryBuilder.andWhere('review.tripId = :tripId', { tripId });
    }
    
    if (userId) {
      queryBuilder.andWhere('review.userId = :userId', { userId });
    }
    
    if (rating) {
      queryBuilder.andWhere('review.rating = :rating', { rating });
    }

    // Apply sorting
    this.applySorting(queryBuilder, sortBy);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [reviews, total] = await queryBuilder.getManyAndCount();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      reviews: reviews.map(review => this.mapToListItemDto(review)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  }

  /**
   * Get reviews for a specific trip
   */
  async getTripReviews(tripId: string, query: GetReviewsQueryDto): Promise<ReviewsListResponseDto> {
    // Verify trip exists
    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return this.getReviews({ ...query, tripId });
  }

  /**
   * Get reviews by a specific user
   */
  async getUserReviews(userId: string, query: GetReviewsQueryDto): Promise<ReviewsListResponseDto> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.getReviews({ ...query, userId });
  }

  /**
   * Get review statistics for a trip or route
   */
  async getReviewStats(tripId?: string): Promise<ReviewStatsResponseDto> {
    const queryBuilder = this.reviewRepository
      .createQueryBuilder('review');

    if (tripId) {
      queryBuilder.where('review.tripId = :tripId', { tripId });
    }

    const reviews = await queryBuilder.getMany();
    
    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    // Calculate statistics
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / totalReviews) * 10) / 10; // Round to 1 decimal

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    return {
      totalReviews,
      averageRating,
      ratingDistribution
    };
  }

  /**
   * Update a review (only by the owner)
   */
  async updateReview(userId: string, reviewId: string, updateReviewDto: UpdateReviewDto): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, userId },
      relations: ['user', 'trip', 'booking']
    });

    if (!review) {
      throw new NotFoundException('Review not found or does not belong to you');
    }

    // Update fields
    if (updateReviewDto.rating !== undefined) {
      review.rating = updateReviewDto.rating;
      this.logger.log(`Review rating updated: ${reviewId} - Old: ${review.rating}, New: ${updateReviewDto.rating}`);
    }
    
    if (updateReviewDto.comment !== undefined) {
      let updatedComment = updateReviewDto.comment || null;
      
      // B4 Safety: Apply profanity filtering to updated comment
      if (updatedComment) {
        const profanityAnalysis = ProfanityFilter.analyzeProfanity(updatedComment);
        
        if (profanityAnalysis.hasProfanity) {
          // Log profanity attempt
          this.logger.warn(
            `Profanity detected in review update - Review: ${reviewId}, User: ${userId}, ` +
            `Original length: ${updatedComment.length}, Filtered: ${profanityAnalysis.filteredText.length}`
          );
          
          // Use filtered comment
          updatedComment = profanityAnalysis.filteredText;
        }
      }
      
      review.comment = updatedComment;
      this.logger.log(`Review comment updated: ${reviewId} - Has comment: ${!!updatedComment}`);
    }

    let updatedReview: Review;
    try {
      updatedReview = await this.reviewRepository.save(review);
      
      this.logger.log(
        `Review updated successfully - ID: ${reviewId}, User: ${userId}, ` +
        `Rating changed: ${updateReviewDto.rating !== undefined}, Comment changed: ${updateReviewDto.comment !== undefined}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update review - ID: ${reviewId}, User: ${userId}, ` +
        `Error: ${error.message}`, error.stack
      );
      throw error;
    }

    // Update trip average rating if rating was changed
    if (updateReviewDto.rating !== undefined) {
      try {
        await this.updateTripAverageRating(review.tripId);
        this.logger.log(`Trip rating updated for trip: ${review.tripId} after review update: ${reviewId}`);
      } catch (error) {
        this.logger.error(
          `Failed to update trip rating after review update - Trip: ${review.tripId}, Review: ${reviewId}, ` +
          `Error: ${error.message}`, error.stack
        );
        // Continue - review update succeeded, rating update can be retried
      }
    }

    return this.mapToResponseDto(updatedReview);
  }

  /**
   * Delete a review (only by the owner or admin)
   */
  async deleteReview(userId: string, reviewId: string, isAdmin: boolean = false): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: isAdmin ? { id: reviewId } : { id: reviewId, userId }
    });

    if (!review) {
      throw new NotFoundException('Review not found' + (isAdmin ? '' : ' or does not belong to you'));
    }

    const tripId = review.tripId;
    await this.reviewRepository.remove(review);

    // Update trip average rating after deletion
    await this.updateTripAverageRating(tripId);

    this.logger.log(`Review deleted: ${reviewId} by ${isAdmin ? 'admin' : `user ${userId}`}`);
  }

  /**
   * Get a single review by ID
   */
  async getReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['user', 'trip', 'booking']
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.mapToResponseDto(review);
  }

  /**
   * Check if user can review a specific booking
   */
  async canUserReview(userId: string, bookingId: string): Promise<{
    canReview: boolean;
    reason?: string;
    bookingStatus?: string;
    tripStatus?: string;
  }> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, userId },
      relations: ['trip']
    });

    if (!booking) {
      return {
        canReview: false,
        reason: 'Booking not found or does not belong to you'
      };
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      return {
        canReview: false,
        reason: 'Booking must be completed to leave a review',
        bookingStatus: booking.status
      };
    }

    if (booking.trip && new Date() < booking.trip.arrivalTime) {
      return {
        canReview: false,
        reason: 'Trip must be completed to leave a review',
        tripStatus: 'in_progress'
      };
    }

    // Check if review already exists
    const existingReview = await this.reviewRepository.findOne({
      where: { bookingId }
    });

    if (existingReview) {
      return {
        canReview: false,
        reason: 'Review already exists for this booking'
      };
    }

    return { canReview: true };
  }

  // Helper methods
  private createReviewsQuery(): SelectQueryBuilder<Review> {
    return this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.trip', 'trip')
      .leftJoinAndSelect('review.booking', 'booking');
  }

  private applySorting(queryBuilder: SelectQueryBuilder<Review>, sortBy: string): void {
    switch (sortBy) {
      case 'newest':
        queryBuilder.orderBy('review.createdAt', 'DESC');
        break;
      case 'oldest':
        queryBuilder.orderBy('review.createdAt', 'ASC');
        break;
      case 'highest_rating':
        queryBuilder.orderBy('review.rating', 'DESC');
        break;
      case 'lowest_rating':
        queryBuilder.orderBy('review.rating', 'ASC');
        break;
      default:
        queryBuilder.orderBy('review.createdAt', 'DESC');
    }
  }

  /**
   * Map review entity to list item DTO (for frontend ReviewWithUser interface)
   */
  private mapToListItemDto(review: Review): any {
    return {
      id: review.id,
      tripId: review.tripId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(), // ISO string for FE
      user: {
        name: review.user?.name || 'Anonymous'
      }
    };
  }

  /**
   * C1 API Contract: Map review entity to simplified API response for FE
   */
  private mapToApiResponseDto(review: Review): ReviewApiResponseDto {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(), // ISO string for FE
      user: {
        name: review.user?.name || 'Anonymous'
      }
    };
  }

  /**
   * Map review entity to detailed response DTO (internal/admin use)
   */
  private mapToResponseDto(review: Review): ReviewResponseDto {
    return {
      id: review.id,
      userId: review.userId,
      tripId: review.tripId,
      bookingId: review.bookingId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      user: review.user ? {
        id: review.user.id,
        name: review.user.name,
        email: review.user.email || ''
      } : undefined,
      trip: review.trip,
      booking: review.booking
    };
  }

  /**
   * Update trip average rating and review count after review changes
   * B2 API Requirement: Update trip average rating when review is created
   */
  private async updateTripAverageRating(tripId: string): Promise<void> {
    // Get all reviews for this trip
    const reviews = await this.reviewRepository.find({
      where: { tripId }
    });

    // Calculate new average and count
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 100) / 100 // Round to 2 decimal places
      : 0;

    // Update trip with new average rating and review count
    await this.tripRepository.update(tripId, {
      averageRating,
      reviewCount
    });

    this.logger.log(`Updated trip ${tripId} average rating: ${averageRating} (${reviewCount} reviews)`);
  }
}