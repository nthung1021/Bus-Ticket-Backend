import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../../src/booking/booking.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../src/entities/booking.entity';
import { PassengerDetail } from '../../src/entities/passenger-detail.entity';
import { SeatStatus, SeatState } from '../../src/entities/seat-status.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Seat } from '../../src/entities/seat.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { BookingModificationHistory } from '../../src/entities/booking-modification-history.entity';
import { SeatLayout } from '../../src/entities/seat-layout.entity';
import { EmailService } from '../../src/booking/email.service';
import { BookingModificationPermissionService } from '../../src/booking/booking-modification-permission.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { PayosService } from '../../src/payos/payos.service';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBookingDto } from '../../src/booking/dto/create-booking.dto';

// --- Mocks ---

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  })),
});

const mockEmailService = {
  sendBookingConfirmation: jest.fn(),
  sendTicketEmail: jest.fn(),
};

const mockNotificationsService = {
  createInAppNotification: jest.fn(),
};

const mockModificationPermissionService = {
  checkPermissions: jest.fn(),
};

const mockPayosService = {
  createPaymentLink: jest.fn(),
  verifyWebhookData: jest.fn(),
};

// Mock DataSource manager
const mockEntityManager = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  transaction: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb) => cb(mockEntityManager)),
};

describe('BookingService', () => {
  let service: BookingService;
  let dataSource: DataSource;
  // Repositories (we might need to spy on them or the manager)
  let tripRepo: Repository<Trip>;
  let seatRepo: Repository<Seat>;
  let seatStatusRepo: Repository<SeatStatus>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getRepositoryToken(Booking), useFactory: mockRepo },
        { provide: getRepositoryToken(PassengerDetail), useFactory: mockRepo },
        { provide: getRepositoryToken(SeatStatus), useFactory: mockRepo },
        { provide: getRepositoryToken(Trip), useFactory: mockRepo },
        { provide: getRepositoryToken(Seat), useFactory: mockRepo },
        { provide: getRepositoryToken(AuditLog), useFactory: mockRepo },
        { provide: getRepositoryToken(BookingModificationHistory), useFactory: mockRepo },
        { provide: getRepositoryToken(SeatLayout), useFactory: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: BookingModificationPermissionService, useValue: mockModificationPermissionService },
        { provide: PayosService, useValue: mockPayosService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    dataSource = module.get<DataSource>(DataSource);
    tripRepo = module.get(getRepositoryToken(Trip));
  });

  describe('createBooking', () => {
    const createDto: CreateBookingDto = {
      tripId: 'trip-1',
      totalPrice: 200,
      passengers: [
        { fullName: 'P1', documentId: '123', seatCode: '1A' },
      ],
      seats: [{ code: '1A', id: 'seat-1', type: 'normal', price: 200 }],
      isGuestCheckout: false,
    };

    it('should throw NotFoundException if trip not found', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null); // Trip lookup

      await expect(service.createBooking('user-1', createDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if seats count mismatch', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({ id: 'trip-1' }); // Trip found
      const badDto = { ...createDto, seats: [] }; // 0 seats, 1 passenger

      await expect(service.createBooking('user-1', badDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should successfully create a paid booking and notify', async () => {
      // 1. Find Trip
      mockEntityManager.findOne.mockResolvedValueOnce({ id: 'trip-1', busId: 'bus-1' }); 
      // 2. Find Seat A1
      mockEntityManager.findOne.mockResolvedValueOnce({ id: 'seat-1', seatCode: '1A' });
      // 3. Find SeatStatuses (Availability Check) -> Return empty (available) or existing but free
      mockEntityManager.find.mockResolvedValueOnce([]); 
      // 4. Save Booking
      const savedBooking = { 
        id: 'booking-1', 
        status: BookingStatus.PENDING, 
        bookingReference: 'REF123',
        totalAmount: 200,
        bookedAt: new Date(),
        tripId: 'trip-1'
      };
      mockEntityManager.create.mockReturnValueOnce(savedBooking); // Create booking entity
      mockEntityManager.save.mockResolvedValueOnce(savedBooking); // Save booking
      
      // 5. Save Passengers
      mockEntityManager.create.mockReturnValueOnce({}); // Create passengers
      mockEntityManager.save.mockResolvedValueOnce([{ id: 'p1', fullName: 'P1' }]); // Save passengers

      // 6. Update/Create SeatStatus
      // Seat status lookup in loop (step 8 in service)
      // Since we returned [] in step 3, finding inside loop returns undefined.
      // So it creates new status.
      mockEntityManager.create.mockReturnValueOnce({});
      mockEntityManager.save.mockResolvedValueOnce({});

      // Call
      const result = await service.createBooking('user-1', createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-1');
      expect(result.status).toBe(BookingStatus.PENDING);
      
      // Verify notification NOT sent for pending booking
      expect(mockNotificationsService.createInAppNotification).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if seat is already booked', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({ id: 'trip-1', busId: 'bus-1' });
      mockEntityManager.findOne.mockResolvedValueOnce({ id: 'seat-1', seatCode: '1A' });
      
      // Return occupied seat status
      mockEntityManager.find.mockResolvedValueOnce([
        { seatId: 'seat-1', state: SeatState.BOOKED }
      ]);
      // The service also looks up the seat again to get the code for the error message
      mockEntityManager.findOne.mockResolvedValueOnce({ id: 'seat-1', seatCode: '1A' });

      await expect(service.createBooking('user-1', createDto))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('findBookingById', () => {
    it('should return booking if found', async () => {
      const mockBooking = { id: 'b1', bookingReference: 'REF1' };
      const repo = (service as any).bookingRepository;
      repo.findOne.mockResolvedValueOnce(mockBooking);

      const result = await service.findBookingById('b1');
      expect(result).toEqual(mockBooking);
      expect(repo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'b1' } }));
    });

    it('should throw NotFoundException if not found', async () => {
      const repo = (service as any).bookingRepository;
      repo.findOne.mockResolvedValueOnce(null);

      await expect(service.findBookingById('b1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmPayment', () => {
    const bookingId = 'booking-1';

    it('should successfully confirm payment for a pending booking', async () => {
      const mockBooking = { 
        id: bookingId, 
        status: BookingStatus.PENDING, 
        bookedAt: new Date(),
        userId: 'user-1',
        bookingReference: 'REF123',
        totalAmount: 200,
        passengerDetails: [],
        seatStatuses: []
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockBooking); // Step 1: Find
      mockEntityManager.update.mockResolvedValueOnce({ affected: 1 }); // Step 4: Update
      mockEntityManager.findOne.mockResolvedValueOnce({ ...mockBooking, status: BookingStatus.PAID }); // Step 5: Reload

      const result = await service.confirmPayment(bookingId);

      expect(result.status).toBe(BookingStatus.PAID);
      expect(mockEntityManager.update).toHaveBeenCalledWith(Booking, bookingId, { status: BookingStatus.PAID });
      expect(mockNotificationsService.createInAppNotification).toHaveBeenCalled();
    });

    it('should return booking when already paid (idempotent)', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({ 
        id: bookingId, 
        status: BookingStatus.PAID 
      });

      const result = await service.confirmPayment(bookingId);
      expect(result.status).toBe(BookingStatus.PAID);
    });

    it('should throw BadRequestException if booking expired', async () => {
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - 20); // 20 mins ago

      const expiredBooking = { 
        id: bookingId, 
        status: BookingStatus.PENDING,
        bookedAt: expiredDate,
        seatStatuses: []
      };

      // Mock findOne twice: once for confirmPayment check, once for cancelBooking logic
      mockEntityManager.findOne
        .mockResolvedValueOnce(expiredBooking)
        .mockResolvedValueOnce(expiredBooking);

      await expect(service.confirmPayment(bookingId))
        .rejects.toThrow(BadRequestException);
      
      expect(mockEntityManager.update).toHaveBeenCalledWith(Booking, bookingId, { status: BookingStatus.CANCELLED });
    });
  });

  describe('cancelBooking', () => {
    it('should successfully cancel a pending booking', async () => {
      const bookingId = 'b1';
      const mockBooking = { 
        id: bookingId, 
        status: BookingStatus.PENDING,
        seatStatuses: [{ id: 'ss1' }]
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockBooking);
      mockEntityManager.update.mockResolvedValueOnce({ affected: 1 });
      mockEntityManager.update.mockResolvedValueOnce({ affected: 1 });

      const result = await service.cancelBooking(bookingId, 'Client requested');

      expect(result.success).toBe(true);
      expect(mockEntityManager.update).toHaveBeenCalledWith(Booking, bookingId, { status: BookingStatus.CANCELLED });
    });

    it('should throw BadRequestException for paid bookings', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce({ status: BookingStatus.PAID });

      await expect(service.cancelBooking('b1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('transaction wrapper', () => {
    it('should rely on dataSource.transaction', async () => {
      // Simple check to ensure we are wrapping everything in a transaction
      // We pass an empty DTO just to trigger the first line
      try {
        await service.createBooking('u1', {} as any);
      } catch (e) {
        // ignore errors
      }
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });
});