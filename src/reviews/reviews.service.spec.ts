import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  NotFoundException, 
  BadRequestException, 
  ConflictException 
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review } from '../entities/review.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Trip } from '../entities/trip.entity';
import { User } from '../entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { GetReviewsQueryDto } from './dto/get-reviews-query.dto';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepository: Repository<Review>;
  let bookingRepository: Repository<Booking>;
  let tripRepository: Repository<Trip>;
  let userRepository: Repository<User>;

  // Mock data
  const mockUserId = 'user-123';
  const mockTripId = 'trip-123';
  const mockBookingId = 'booking-123';
  const mockReviewId = 'review-123';

  const mockUser: Partial<User> = {
    id: mockUserId,
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockTrip: Partial<Trip> = {
    id: mockTripId,
    arrivalTime: new Date('2023-01-01T10:00:00Z'), // Past date
  };

  const mockBooking: Partial<Booking> = {
    id: mockBookingId,
    userId: mockUserId,
    tripId: mockTripId,
    status: BookingStatus.PAID,
    trip: mockTrip as Trip,
    user: mockUser as User,
  };

  const mockReview: Partial<Review> = {
    id: mockReviewId,
    userId: mockUserId,
    tripId: mockTripId,
    bookingId: mockBookingId,
    rating: 5,
    comment: 'Great trip!',
    createdAt: new Date(),
    user: mockUser as User,
    trip: mockTrip as Trip,
    booking: mockBooking as Booking,
  };

  const mockCreateReviewDto: CreateReviewDto = {
    bookingId: mockBookingId,
    rating: 5,
    comment: 'Great trip!',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Trip),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    reviewRepository = module.get<Repository<Review>>(getRepositoryToken(Review));
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    tripRepository = module.get<Repository<Trip>>(getRepositoryToken(Trip));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReview', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a review successfully', async () => {
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking as Booking);
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null); // No existing review
      jest.spyOn(reviewRepository, 'create').mockReturnValue(mockReview as Review);
      jest.spyOn(reviewRepository, 'save').mockResolvedValue(mockReview as Review);

      const result = await service.createReview(mockUserId, mockCreateReviewDto);

      expect(result).toEqual({
        id: mockReviewId,
        userId: mockUserId,
        tripId: mockTripId,
        bookingId: mockBookingId,
        rating: 5,
        comment: 'Great trip!',
        createdAt: expect.any(Date),
        user: {
          id: mockUserId,
          name: 'John Doe',
          email: 'john@example.com',
        },
        trip: mockTrip,
        booking: mockBooking,
      });
    });

    it('should throw NotFoundException if booking not found', async () => {
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.createReview(mockUserId, mockCreateReviewDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if booking is not paid', async () => {
      const unpaidBooking = { ...mockBooking, status: BookingStatus.PENDING };
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(unpaidBooking as Booking);

      await expect(
        service.createReview(mockUserId, mockCreateReviewDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if trip is not completed', async () => {
      const futureTrip = { ...mockTrip, arrivalTime: new Date('2030-01-01T10:00:00Z') };
      const bookingWithFutureTrip = { ...mockBooking, trip: futureTrip };
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(bookingWithFutureTrip as Booking);

      await expect(
        service.createReview(mockUserId, mockCreateReviewDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if review already exists', async () => {
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking as Booking);
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(mockReview as Review);

      await expect(
        service.createReview(mockUserId, mockCreateReviewDto)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getReviews', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return paginated reviews', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockReview], 1]),
      };

      jest.spyOn(reviewRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const query: GetReviewsQueryDto = { page: 1, limit: 10, sortBy: 'newest' };
      const result = await service.getReviews(query);

      expect(result).toEqual({
        reviews: expect.any(Array),
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });
  });

  describe('getReviewStats', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return review statistics', async () => {
      const mockReviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockReviews),
      };

      jest.spyOn(reviewRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getReviewStats(mockTripId);

      expect(result).toEqual({
        totalReviews: 3,
        averageRating: 4.7, // (5+4+5)/3 = 4.67 rounded to 4.7
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 1,
          5: 2,
        },
      });
    });

    it('should return empty stats when no reviews exist', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(reviewRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getReviewStats(mockTripId);

      expect(result).toEqual({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      });
    });
  });

  describe('updateReview', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update a review successfully', async () => {
      const updateDto: UpdateReviewDto = { rating: 4, comment: 'Updated comment' };
      const updatedReview = { ...mockReview, ...updateDto };

      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(mockReview as Review);
      jest.spyOn(reviewRepository, 'save').mockResolvedValue(updatedReview as Review);

      const result = await service.updateReview(mockUserId, mockReviewId, updateDto);

      expect(result.rating).toBe(4);
      expect(result.comment).toBe('Updated comment');
    });

    it('should throw NotFoundException if review not found', async () => {
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null);

      const updateDto: UpdateReviewDto = { rating: 4 };

      await expect(
        service.updateReview(mockUserId, mockReviewId, updateDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteReview', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should delete a review successfully', async () => {
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(mockReview as Review);
      jest.spyOn(reviewRepository, 'remove').mockResolvedValue(mockReview as Review);

      await expect(
        service.deleteReview(mockUserId, mockReviewId)
      ).resolves.not.toThrow();

      expect(reviewRepository.remove).toHaveBeenCalledWith(mockReview);
    });

    it('should throw NotFoundException if review not found', async () => {
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.deleteReview(mockUserId, mockReviewId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('canUserReview', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true if user can review', async () => {
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking as Booking);
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(null);

      const result = await service.canUserReview(mockUserId, mockBookingId);

      expect(result).toEqual({ canReview: true });
    });

    it('should return false if booking not found', async () => {
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(null);

      const result = await service.canUserReview(mockUserId, mockBookingId);

      expect(result).toEqual({
        canReview: false,
        reason: 'Booking not found or does not belong to you',
      });
    });

    it('should return false if booking is not paid', async () => {
      const unpaidBooking = { ...mockBooking, status: BookingStatus.PENDING };
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(unpaidBooking as Booking);

      const result = await service.canUserReview(mockUserId, mockBookingId);

      expect(result).toEqual({
        canReview: false,
        reason: 'Booking must be completed (paid) to leave a review',
        bookingStatus: BookingStatus.PENDING,
      });
    });

    it('should return false if review already exists', async () => {
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking as Booking);
      jest.spyOn(reviewRepository, 'findOne').mockResolvedValue(mockReview as Review);

      const result = await service.canUserReview(mockUserId, mockBookingId);

      expect(result).toEqual({
        canReview: false,
        reason: 'Review already exists for this booking',
      });
    });
  });
});