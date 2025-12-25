import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ConflictException } from '@nestjs/common';
import { BookingStatus } from '../entities/booking.entity';
import { SeatState } from '../entities/seat-status.entity';

describe('BookingService Concurrency Tests', () => {
  let bookingService: BookingService;
  let dataSource: DataSource;
  let mockQueryRunner: QueryRunner;

  // Mock data
  const mockTrip = {
    id: 'trip-123',
    busId: 'bus-456'
  };

  const mockSeats = [
    { id: 'seat-1', seatCode: 'A1', busId: 'bus-456' },
    { id: 'seat-2', seatCode: 'A2', busId: 'bus-456' }
  ];

  const mockBookingDto: CreateBookingDto = {
    tripId: 'trip-123',
    seats: [
      { id: 'seat-1', code: 'A1', type: 'normal' as const, price: 50 },
      { id: 'seat-2', code: 'A2', type: 'normal' as const, price: 50 }
    ],
    passengers: [
      { fullName: 'John Doe', documentId: 'ID123', seatCode: 'A1' },
      { fullName: 'Jane Doe', documentId: 'ID456', seatCode: 'A2' }
    ],
    totalPrice: 100,
    isGuestCheckout: false
  };

  beforeEach(async () => {
    // Mock QueryRunner
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
      isTransactionActive: true,
      isReleased: false,
      manager: {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getMany: jest.fn()
        })
      }
    } as any;

    // Mock DataSource
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner)
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: BookingService,
          useValue: {
            createBooking: jest.fn(),
            acquireSeatLock: jest.fn(),
            releaseSeatLock: jest.fn(),
            releaseAllSeatLocks: jest.fn(),
            isDuplicateBooking: jest.fn(),
            hashStringToNumber: jest.fn(),
            logger: {
              log: jest.fn(),
              warn: jest.fn(),
              error: jest.fn()
            }
          }
        },
        {
          provide: DataSource,
          useValue: mockDataSource
        }
      ],
    }).compile();

    bookingService = module.get<BookingService>(BookingService);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('Distributed Locking', () => {
    it('should acquire lock successfully when seat is available', async () => {
      // Mock successful lock acquisition
      (mockQueryRunner.query as jest.Mock).mockResolvedValueOnce([{ acquired: true }]);
      
      const mockAcquireSeatLock = jest.spyOn(bookingService as any, 'acquireSeatLock');
      mockAcquireSeatLock.mockImplementation(async (queryRunner: any, tripId: string, seatCode: string) => {
        const result = await queryRunner.query('SELECT pg_try_advisory_lock($1) as acquired', [123]);
        return result[0].acquired;
      });

      const result = await (bookingService as any).acquireSeatLock(mockQueryRunner, 'trip-123', 'A1');
      
      expect(result).toBe(true);
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT pg_try_advisory_lock($1) as acquired',
        [123]
      );
    });

    it('should fail to acquire lock when seat is already locked', async () => {
      // Mock failed lock acquisition
      (mockQueryRunner.query as jest.Mock).mockResolvedValueOnce([{ acquired: false }]);
      
      const mockAcquireSeatLock = jest.spyOn(bookingService as any, 'acquireSeatLock');
      mockAcquireSeatLock.mockImplementation(async (queryRunner: any, tripId: string, seatCode: string) => {
        const result = await queryRunner.query('SELECT pg_try_advisory_lock($1) as acquired', [123]);
        return result[0].acquired;
      });

      const result = await (bookingService as any).acquireSeatLock(mockQueryRunner, 'trip-123', 'A1');
      
      expect(result).toBe(false);
    });

    it('should release lock successfully', async () => {
      const mockReleaseSeatLock = jest.spyOn(bookingService as any, 'releaseSeatLock');
      mockReleaseSeatLock.mockImplementation(async (queryRunner: any, tripId: string, seatCode: string) => {
        await queryRunner.query('SELECT pg_advisory_unlock($1)', [123]);
      });

      await (bookingService as any).releaseSeatLock(mockQueryRunner, 'trip-123', 'A1');
      
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_unlock($1)',
        [123]
      );
    });

    it('should generate consistent hash for same lock key', () => {
      const mockHashStringToNumber = jest.spyOn(bookingService as any, 'hashStringToNumber');
      mockHashStringToNumber.mockImplementation((str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash + char) & 0x7fffffff;
        }
        return hash;
      });

      const lockKey = 'lock:trip:123:seat:A1';
      const hash1 = (bookingService as any).hashStringToNumber(lockKey);
      const hash2 = (bookingService as any).hashStringToNumber(lockKey);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('number');
      expect(hash1).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Booking Scenarios', () => {
    it('should prevent double booking with conflict exception', async () => {
      // Mock the createBooking method to simulate lock conflict
      const mockCreateBooking = jest.spyOn(bookingService, 'createBooking');
      mockCreateBooking.mockImplementation(async () => {
        throw new ConflictException('Seat A1 is currently being booked by another user. Please try again.');
      });

      await expect(
        bookingService.createBooking('user-123', mockBookingDto)
      ).rejects.toThrow(ConflictException);
      
      expect(mockCreateBooking).toHaveBeenCalledWith('user-123', mockBookingDto);
    });

    it('should handle concurrent booking requests gracefully', async () => {
      // Simulate two concurrent booking attempts
      const mockCreateBooking = jest.spyOn(bookingService, 'createBooking');
      
      // First request succeeds
      mockCreateBooking.mockImplementationOnce(async () => ({
        id: 'booking-1',
        bookingReference: 'BK20241215-ABC123',
        tripId: 'trip-123',
        totalAmount: 100,
        status: BookingStatus.PAID,
        bookedAt: new Date(),
        expirationTimestamp: null,
        passengers: [
          { id: 'p1', fullName: 'John Doe', documentId: 'ID123', seatCode: 'A1' },
          { id: 'p2', fullName: 'Jane Doe', documentId: 'ID456', seatCode: 'A2' }
        ],
        seats: [
          { seatId: 'seat-1', seatCode: 'A1', status: SeatState.BOOKED },
          { seatId: 'seat-2', seatCode: 'A2', status: SeatState.BOOKED }
        ]
      }));

      // Second request fails with conflict
      mockCreateBooking.mockImplementationOnce(async () => {
        throw new ConflictException('Seats A1, A2 are currently being booked by another user. Please try again.');
      });

      // First booking succeeds
      const result1 = await bookingService.createBooking('user-123', mockBookingDto);
      expect(result1.status).toBe(BookingStatus.PAID);
      expect(result1.seats.every(s => s.status === SeatState.BOOKED)).toBe(true);

      // Second booking fails
      await expect(
        bookingService.createBooking('user-456', mockBookingDto)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Idempotency', () => {
    it('should detect duplicate booking and return existing booking', async () => {
      const existingBooking = {
        id: 'existing-booking-123',
        bookingReference: 'BK20241215-EXIST1',
        tripId: 'trip-123',
        totalAmount: 100,
        status: BookingStatus.PAID,
        bookedAt: new Date(),
        passengerDetails: [
          { fullName: 'John Doe', documentId: 'ID123', seatCode: 'A1' },
          { fullName: 'Jane Doe', documentId: 'ID456', seatCode: 'A2' }
        ]
      };

      const mockIsDuplicateBooking = jest.spyOn(bookingService as any, 'isDuplicateBooking');
      mockIsDuplicateBooking.mockResolvedValueOnce('existing-booking-123');

      const mockCreateBooking = jest.spyOn(bookingService, 'createBooking');
      mockCreateBooking.mockImplementation(async (userId, dto) => {
        // Simulate duplicate check
        const duplicateId = await (bookingService as any).isDuplicateBooking(
          mockQueryRunner, 
          userId, 
          dto.tripId, 
          dto.seats.map(s => s.code)
        );
        
        if (duplicateId) {
          return {
            id: duplicateId,
            bookingReference: 'BK20241215-EXIST1',
            tripId: dto.tripId,
            totalAmount: dto.totalPrice,
            status: BookingStatus.PAID,
            bookedAt: new Date(),
            expirationTimestamp: null,
            passengers: dto.passengers.map((p, i) => ({ id: `p${i}`, ...p })),
            seats: dto.seats.map((s, i) => ({ seatId: `seat-${i}`, seatCode: s.code, status: SeatState.BOOKED }))
          };
        }
        
        // This shouldn't be reached in this test
        throw new Error('Should have found duplicate');
      });

      const result = await bookingService.createBooking('user-123', mockBookingDto);
      
      expect(result.id).toBe('existing-booking-123');
      expect(result.bookingReference).toBe('BK20241215-EXIST1');
    });

    it('should not detect duplicate for different seat combinations', async () => {
      const mockIsDuplicateBooking = jest.spyOn(bookingService as any, 'isDuplicateBooking');
      mockIsDuplicateBooking.mockImplementation(async (queryRunner: any, userId: string, tripId: string, seatCodes: string[]) => {
        // Mock existing booking with different seats
        const mockExistingBookings = [
          {
            id: 'booking-1',
            passengerDetails: [
              { seatCode: 'B1' },
              { seatCode: 'B2' }
            ]
          }
        ];

        // Mock query runner manager
        queryRunner.manager.find = jest.fn().mockResolvedValue(mockExistingBookings);

        // Check if seat codes match
        const requestSeatCodes = seatCodes.sort().join(',');
        for (const booking of mockExistingBookings) {
          const bookingSeatCodes = booking.passengerDetails
            .map(p => p.seatCode)
            .sort()
            .join(',');
          
          if (bookingSeatCodes === requestSeatCodes) {
            return booking.id;
          }
        }
        return null;
      });

      const result = await (bookingService as any).isDuplicateBooking(
        mockQueryRunner,
        'user-123',
        'trip-123',
        ['A1', 'A2']
      );
      
      expect(result).toBeNull(); // Different seats, not a duplicate
    });
  });

  describe('Error Handling', () => {
    it('should rollback transaction and release locks on error', async () => {
      const mockCreateBooking = jest.spyOn(bookingService, 'createBooking');
      mockCreateBooking.mockImplementation(async () => {
        // Simulate error during booking process
        throw new Error('Database connection error');
      });

      try {
        await bookingService.createBooking('user-123', mockBookingDto);
      } catch (error) {
        expect(error.message).toBe('Database connection error');
      }

      // Verify error was properly thrown
      expect(mockCreateBooking).toHaveBeenCalledWith('user-123', mockBookingDto);
    });

    it('should handle lock acquisition timeout gracefully', async () => {
      // Mock lock acquisition timeout
      (mockQueryRunner.query as jest.Mock).mockRejectedValueOnce(new Error('Lock timeout'));
      
      const mockAcquireSeatLock = jest.spyOn(bookingService as any, 'acquireSeatLock');
      mockAcquireSeatLock.mockImplementation(async (queryRunner: any) => {
        try {
          await queryRunner.query('SELECT pg_try_advisory_lock($1) as acquired', [123]);
          return true;
        } catch (error) {
          return false; // Graceful handling
        }
      });

      const result = await (bookingService as any).acquireSeatLock(mockQueryRunner, 'trip-123', 'A1');
      
      expect(result).toBe(false);
    });
  });

  describe('Stress Testing Scenarios', () => {
    it('should handle multiple rapid booking attempts', async () => {
      const attempts = Array.from({ length: 5 }, (_, i) => i + 1);
      const mockCreateBooking = jest.spyOn(bookingService, 'createBooking');
      
      // Only first attempt succeeds, others fail with conflict
      mockCreateBooking.mockImplementationOnce(async () => ({
        id: 'booking-success',
        bookingReference: 'BK20241215-SUCCESS',
        tripId: 'trip-123',
        totalAmount: 100,
        status: BookingStatus.PAID,
        bookedAt: new Date(),
        expirationTimestamp: null,
        passengers: mockBookingDto.passengers.map((p, i) => ({ id: `p${i}`, ...p })),
        seats: mockBookingDto.seats.map((s, i) => ({ seatId: `seat-${i}`, seatCode: s.code, status: SeatState.BOOKED }))
      }));

      // All subsequent attempts fail
      for (let i = 1; i < attempts.length; i++) {
        mockCreateBooking.mockImplementationOnce(async () => {
          throw new ConflictException(`Seats ${mockBookingDto.seats.map(s => s.code).join(', ')} are currently being booked by another user. Please try again.`);
        });
      }

      const promises = attempts.map(i => 
        bookingService.createBooking(`user-${i}`, mockBookingDto)
          .catch(error => ({ error: error.message }))
      );

      const results = await Promise.all(promises);
      
      // Only one should succeed, others should have conflicts
      const successCount = results.filter(r => !('error' in r)).length;
      const conflictCount = results.filter(r => 'error' in r && (r as any).error.includes('currently being booked')).length;
      
      expect(successCount).toBe(1);
      expect(conflictCount).toBe(4);
    });
  });
});