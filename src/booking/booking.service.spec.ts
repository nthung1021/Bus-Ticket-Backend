import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { BookingService } from './booking.service';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { SeatStatus } from '../entities/seat-status.entity';
import { Trip } from '../entities/trip.entity';
import { Seat } from '../entities/seat.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { BookingModificationHistory } from '../entities/booking-modification-history.entity';
import { SeatLayout } from '../entities/seat-layout.entity';
import { EmailService } from './email.service';
import { BookingModificationPermissionService } from './booking-modification-permission.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: Repository<Booking>;
  let mockQueryBuilder: Partial<SelectQueryBuilder<Booking>>;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockEmailService = {
    sendBookingConfirmation: jest.fn(),
    sendBookingCancellation: jest.fn(),
  };

  const mockModificationPermissionService = {
    checkModificationPermissions: jest.fn(),
    validateModificationRequest: jest.fn(),
  };

  const mockBookingData = [
    {
      id: 'booking-1',
      userId: 'user-1',
      tripId: 'trip-1',
      totalAmount: 500000,
      status: BookingStatus.PAID,
      bookedAt: new Date('2025-12-01T08:00:00Z'),
      cancelledAt: null,
      trip: {
        id: 'trip-1',
        departureTime: new Date('2025-12-07T08:00:00Z'),
        arrivalTime: new Date('2025-12-07T18:00:00Z'),
        basePrice: 450000,
        status: 'scheduled',
        route: {
          id: 'route-1',
          name: 'Hanoi - Ho Chi Minh City',
          description: 'Express route',
          origin: 'Hanoi',
          destination: 'Ho Chi Minh City',
          distanceKm: 1700,
          estimatedMinutes: 600,
        },
        bus: {
          id: 'bus-1',
          plateNumber: '30A-12345',
          model: 'Hyundai Universe',
          seatCapacity: 45,
        },
      },
      passengerDetails: [
        {
          id: 'passenger-1',
          fullName: 'Nguyen Van A',
          documentId: '123456789',
          seatCode: 'A1',
        },
      ],
      seatStatuses: [
        {
          id: 'seat-status-1',
          seatId: 'seat-1',
          state: 'booked',
          lockedUntil: null,
          seat: {
            id: 'seat-1',
            seatCode: 'A1',
            seatType: 'vip',
            isActive: true,
          },
        },
      ],
    },
  ];

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PassengerDetail),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SeatStatus),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Trip),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(BookingModificationHistory),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(SeatLayout),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: BookingModificationPermissionService,
          useValue: mockModificationPermissionService,
        },
        {
          provide: NotificationsService,
          useValue: {
            createInAppNotification: jest.fn().mockResolvedValue({ id: 'notification-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBookingsByUserWithDetails', () => {
    it('should return user bookings with all details when no status filter', async () => {
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockBookingData);

      const result = await service.findBookingsByUserWithDetails('user-1');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('booking');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('booking.trip', 'trip');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('trip.route', 'route');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('trip.bus', 'bus');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('booking.passengerDetails', 'passengerDetails');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('booking.seatStatuses', 'seatStatuses');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('seatStatuses.seat', 'seat');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('booking.userId = :userId', { userId: 'user-1' });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('booking.bookedAt', 'DESC');
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('booking-1');
      expect(result[0].trip).toBeDefined();
      expect(result[0].passengers).toHaveLength(1);
      expect(result[0].seats).toHaveLength(1);
    });

    it('should apply status filter when provided', async () => {
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockBookingData);

      await service.findBookingsByUserWithDetails('user-1', BookingStatus.PAID);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('booking.status = :status', { status: BookingStatus.PAID });
    });

    it('should calculate expiration time for pending bookings', async () => {
      const pendingBooking = {
        ...mockBookingData[0],
        status: BookingStatus.PENDING,
        bookedAt: new Date('2025-12-01T08:00:00Z'),
      };
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([pendingBooking]);

      const result = await service.findBookingsByUserWithDetails('user-1');

      expect(result[0].expiresAt).toEqual(new Date('2025-12-01T08:15:00Z'));
    });

    it('should handle bookings with null trip data', async () => {
      const bookingWithoutTrip = {
        ...mockBookingData[0],
        trip: null,
      };
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([bookingWithoutTrip]);

      const result = await service.findBookingsByUserWithDetails('user-1');

      expect(result[0].trip).toBeNull();
    });

    it('should return empty array when user has no bookings', async () => {
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findBookingsByUserWithDetails('user-1');

      expect(result).toEqual([]);
    });

    it('should transform route data correctly', async () => {
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockBookingData);

      const result = await service.findBookingsByUserWithDetails('user-1');

      const route = result[0].trip?.route;
      expect(route).toBeDefined();
      expect(route?.name).toBe('Hanoi - Ho Chi Minh City');
      expect(route?.origin).toBe('Hanoi');
      expect(route?.destination).toBe('Ho Chi Minh City');
    });

    it('should transform passenger data correctly', async () => {
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockBookingData);

      const result = await service.findBookingsByUserWithDetails('user-1');

      const passengers = result[0].passengers;
      expect(passengers).toHaveLength(1);
      expect(passengers[0].fullName).toBe('Nguyen Van A');
      expect(passengers[0].seatCode).toBe('A1');
    });
  });

  describe('Booking Expiration Logic', () => {
    let mockEntityManager: any;
    let mockSeatStatusRepository: any;
    let mockAuditLogRepository: any;

    beforeEach(() => {
      mockEntityManager = {
        findOne: jest.fn(),
        update: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
      };

      mockSeatStatusRepository = {
        find: jest.fn(),
        update: jest.fn(),
      };

      mockAuditLogRepository = {
        save: jest.fn(),
        create: jest.fn(),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        return callback(mockEntityManager);
      });
    });

    describe('findExpiredBookings', () => {
      it('should find bookings that have expired', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-expired-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20), // 20 minutes ago
            userId: 'user-1',
            trip: {
              route: {
                origin: 'Hà Nội',
                destination: 'TP. Hồ Chí Minh'
              }
            }
          },
          {
            id: 'booking-expired-2', 
            bookingReference: 'REF002',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            userId: 'user-2',
            trip: {
              route: {
                origin: 'Hà Nội',
                destination: 'Đà Nẵng'
              }
            }
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        // Act
        const result = await service.findExpiredBookings();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].bookingReference).toBe('REF001');
        expect(result[1].bookingReference).toBe('REF002');
        expect(mockQB.where).toHaveBeenCalledWith('booking.status = :status', { status: BookingStatus.PENDING });
        expect(mockQB.andWhere).toHaveBeenCalledWith('booking.expiresAt < :now', expect.any(Object));
      });

      it('should return empty array when no expired bookings found', async () => {
        // Arrange
        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        // Act
        const result = await service.findExpiredBookings();

        // Assert
        expect(result).toHaveLength(0);
      });
    });

    describe('expireBookings', () => {
      it('should successfully expire multiple bookings with idempotency', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20),
            userId: 'user-1',
            tripId: 'trip-1',
            totalAmount: 500000,
            trip: {
              route: { origin: 'Hà Nội', destination: 'TP. Hồ Chí Minh' }
            }
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        // Mock successful database updates
        mockEntityManager.findOne.mockResolvedValue({
          id: 'booking-1',
          status: BookingStatus.PENDING,
          expiresAt: new Date(Date.now() - 1000 * 60 * 20),
          bookingReference: 'REF001'
        });

        mockEntityManager.update.mockResolvedValueOnce({ affected: 1 }); // Booking update
        mockEntityManager.update.mockResolvedValueOnce({ affected: 2 }); // Seat update

        // Mock audit log creation
        service['createAuditLog'] = jest.fn().mockResolvedValue({});

        // Act
        const result = await service.expireBookings();

        // Assert
        expect(result.expiredCount).toBe(1);
        expect(result.bookings).toContain('REF001');
        expect(mockDataSource.transaction).toHaveBeenCalled();
        expect(mockEntityManager.findOne).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            where: { id: 'booking-1', status: BookingStatus.PENDING }
          })
        );
        expect(mockEntityManager.update).toHaveBeenCalledWith(
          expect.anything(),
          { id: 'booking-1', status: BookingStatus.PENDING },
          expect.objectContaining({
            status: BookingStatus.EXPIRED,
            cancelledAt: expect.any(Date),
            lastModifiedAt: expect.any(Date),
          })
        );
      });

      it('should skip bookings that are no longer PENDING (idempotency)', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20),
            userId: 'user-1',
            tripId: 'trip-1',
            totalAmount: 500000
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        // Mock booking that's already been processed (no longer PENDING)
        mockEntityManager.findOne.mockResolvedValue(null);

        // Act
        const result = await service.expireBookings();

        // Assert
        expect(result.expiredCount).toBe(0);
        expect(result.bookings).toHaveLength(0);
        expect(mockEntityManager.update).not.toHaveBeenCalled();
      });

      it('should skip bookings where expiration time was updated', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20),
            userId: 'user-1',
            tripId: 'trip-1',
            totalAmount: 500000
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        // Mock booking with updated expiration time (future date)
        mockEntityManager.findOne.mockResolvedValue({
          id: 'booking-1',
          status: BookingStatus.PENDING,
          expiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes in future
          bookingReference: 'REF001'
        });

        // Act
        const result = await service.expireBookings();

        // Assert
        expect(result.expiredCount).toBe(0);
        expect(result.bookings).toHaveLength(0);
        expect(mockEntityManager.update).not.toHaveBeenCalled();
      });

      it('should handle race conditions gracefully', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20),
            userId: 'user-1',
            tripId: 'trip-1',
            totalAmount: 500000
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        mockEntityManager.findOne.mockResolvedValue({
          id: 'booking-1',
          status: BookingStatus.PENDING,
          expiresAt: new Date(Date.now() - 1000 * 60 * 20),
          bookingReference: 'REF001'
        });

        // Mock race condition - update affects 0 rows (already processed by another instance)
        mockEntityManager.update.mockResolvedValueOnce({ affected: 0 });

        // Act
        const result = await service.expireBookings();

        // Assert
        expect(result.expiredCount).toBe(0);
        expect(result.bookings).toHaveLength(0);
      });

      it('should continue processing after individual booking failures', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20),
            userId: 'user-1',
            tripId: 'trip-1',
            totalAmount: 500000
          },
          {
            id: 'booking-2',
            bookingReference: 'REF002',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 15),
            userId: 'user-2',
            tripId: 'trip-2',
            totalAmount: 300000
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        // Mock first booking fails, second succeeds
        mockDataSource.transaction
          .mockRejectedValueOnce(new Error('Database constraint violation'))
          .mockImplementationOnce(async (callback) => {
            mockEntityManager.findOne.mockResolvedValue({
              id: 'booking-2',
              status: BookingStatus.PENDING,
              expiresAt: new Date(Date.now() - 1000 * 60 * 15),
              bookingReference: 'REF002'
            });
            mockEntityManager.update.mockResolvedValueOnce({ affected: 1 });
            mockEntityManager.update.mockResolvedValueOnce({ affected: 1 });
            return callback(mockEntityManager);
          });

        service['createAuditLog'] = jest.fn().mockResolvedValue({});

        // Act
        const result = await service.expireBookings();

        // Assert
        expect(result.expiredCount).toBe(1);
        expect(result.bookings).toContain('REF002');
        expect(result.bookings).not.toContain('REF001');
      });

      it('should handle constraint violations as idempotency indicators', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20),
            userId: 'user-1',
            tripId: 'trip-1',
            totalAmount: 500000
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        // Mock constraint violation (booking already processed)
        const constraintError = new Error('duplicate key value violates unique constraint');
        mockDataSource.transaction.mockRejectedValue(constraintError);

        // Act
        const result = await service.expireBookings();

        // Assert
        expect(result.expiredCount).toBe(0);
        expect(result.bookings).toHaveLength(0);
        // Should not throw error - constraint violations are handled gracefully
      });

      it('should release only locked seats for expired bookings', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20),
            userId: 'user-1',
            tripId: 'trip-1',
            totalAmount: 500000
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        mockEntityManager.findOne.mockResolvedValue({
          id: 'booking-1',
          status: BookingStatus.PENDING,
          expiresAt: new Date(Date.now() - 1000 * 60 * 20),
          bookingReference: 'REF001'
        });

        mockEntityManager.update.mockResolvedValueOnce({ affected: 1 }); // Booking update
        mockEntityManager.update.mockResolvedValueOnce({ affected: 3 }); // Seat update (3 seats released)

        service['createAuditLog'] = jest.fn().mockResolvedValue({});

        // Act
        const result = await service.expireBookings();

        // Assert
        expect(result.expiredCount).toBe(1);
        expect(mockEntityManager.update).toHaveBeenNthCalledWith(
          2, // Second update call (seats)
          expect.anything(),
          expect.objectContaining({
            bookingId: 'booking-1',
            state: expect.anything() // Should check for LOCKED state
          }),
          expect.objectContaining({
            state: expect.anything(), // Should set to AVAILABLE
            bookingId: null,
            lockedUntil: null,
          })
        );
      });

      it('should create detailed audit logs with session tracking', async () => {
        // Arrange
        const expiredBookings = [
          {
            id: 'booking-1',
            bookingReference: 'REF001',
            status: BookingStatus.PENDING,
            expiresAt: new Date(Date.now() - 1000 * 60 * 20),
            userId: 'user-1',
            tripId: 'trip-1',
            totalAmount: 500000
          }
        ];

        const mockQB = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(expiredBookings),
        };

        mockRepository.createQueryBuilder.mockReturnValue(mockQB);

        mockEntityManager.findOne.mockResolvedValue({
          id: 'booking-1',
          status: BookingStatus.PENDING,
          expiresAt: new Date(Date.now() - 1000 * 60 * 20),
          bookingReference: 'REF001'
        });

        mockEntityManager.update.mockResolvedValueOnce({ affected: 1 });
        mockEntityManager.update.mockResolvedValueOnce({ affected: 2 });

        const createAuditLogSpy = jest.spyOn(service as any, 'createAuditLog').mockResolvedValue({});

        // Act
        const result = await service.expireBookings();

        // Assert
        expect(result.expiredCount).toBe(1);
        expect(createAuditLogSpy).toHaveBeenCalledWith(
          'BOOKING_EXPIRED',
          expect.stringContaining('REF001'),
          undefined, // system action
          'user-1',
          expect.objectContaining({
            bookingReference: 'REF001',
            tripId: 'trip-1',
            totalAmount: 500000,
            sessionId: expect.stringMatching(/^exp-svc-\d+-[a-z0-9]+$/),
            seatsReleased: 2,
          })
        );
      });
    });

    describe('isBookingExpired', () => {
      it('should return true for expired pending bookings', async () => {
        // Arrange
        const expiredBooking = {
          id: 'booking-1',
          status: BookingStatus.PENDING,
          expiresAt: new Date(Date.now() - 1000 * 60 * 10) // 10 minutes ago
        };

        mockRepository.findOne.mockResolvedValue(expiredBooking);

        // Act
        const result = await service.isBookingExpired('booking-1');

        // Assert
        expect(result).toBe(true);
      });

      it('should return false for non-expired pending bookings', async () => {
        // Arrange
        const activeBooking = {
          id: 'booking-1',
          status: BookingStatus.PENDING,
          expiresAt: new Date(Date.now() + 1000 * 60 * 10) // 10 minutes in future
        };

        mockRepository.findOne.mockResolvedValue(activeBooking);

        // Act
        const result = await service.isBookingExpired('booking-1');

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for non-pending bookings', async () => {
        // Arrange
        const paidBooking = {
          id: 'booking-1',
          status: BookingStatus.PAID,
          expiresAt: new Date(Date.now() - 1000 * 60 * 10) // Even if expired
        };

        mockRepository.findOne.mockResolvedValue(paidBooking);

        // Act
        const result = await service.isBookingExpired('booking-1');

        // Assert
        expect(result).toBe(false);
      });

      it('should return true for non-existent bookings', async () => {
        // Arrange
        mockRepository.findOne.mockResolvedValue(null);

        // Act
        const result = await service.isBookingExpired('non-existent');

        // Assert
        expect(result).toBe(true);
      });
    });
  });
});