import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingSchedulerService } from './booking-scheduler.service';
import { BookingExpirationScheduler } from './booking-expiration-scheduler.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '../entities/booking.entity';

describe('BookingController', () => {
  let controller: BookingController;
  let service: BookingService;
  let expirationScheduler: BookingExpirationScheduler;

  const mockBookingService = {
    createBooking: jest.fn(),
    findBookingById: jest.fn(),
    findBookingsByUser: jest.fn(),
    findBookingByGuest: jest.fn(),
    cancelBooking: jest.fn(),
    cancelBookingByUser: jest.fn(),
    confirmPayment: jest.fn(),
    generateEticketFile: jest.fn(),
    sendEticketEmail: jest.fn(),
  };

  const mockSchedulerService = {};
  const mockExpirationScheduler = {
    triggerManualExpiration: jest.fn(),
    getCronJobStatus: jest.fn(),
    restartCronJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        { provide: BookingService, useValue: mockBookingService },
        { provide: BookingSchedulerService, useValue: mockSchedulerService },
        { provide: BookingExpirationScheduler, useValue: mockExpirationScheduler },
      ],
    }).compile();

    controller = module.get<BookingController>(BookingController);
    service = module.get<BookingService>(BookingService);
    expirationScheduler = module.get<BookingExpirationScheduler>(BookingExpirationScheduler);
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should call service.createBooking with userId from request', async () => {
      const dto: CreateBookingDto = { tripId: 't1', totalPrice: 100, passengers: [], seats: [] };
      const req = { user: { userId: 'u1' } };
      
      mockBookingService.createBooking.mockResolvedValueOnce({
        id: 'b1',
        status: BookingStatus.PENDING
      });

      const result = await controller.createBooking(req, dto);

      expect(mockBookingService.createBooking).toHaveBeenCalledWith('u1', dto);
      expect(result.data.id).toBe('b1');
      expect(result.success).toBe(true);
    });

    it('should pass null userId for guest users', async () => {
      const dto: CreateBookingDto = { tripId: 't1', totalPrice: 100, passengers: [], seats: [] };
      const req = { user: undefined }; // No user logged in
      
      mockBookingService.createBooking.mockResolvedValueOnce({
        id: 'b2',
        status: BookingStatus.PENDING
      });

      await controller.createBooking(req, dto);

      expect(mockBookingService.createBooking).toHaveBeenCalledWith(null, dto);
    });
  });

  describe('getBookingDetails', () => {
    it('should return transformed booking details', async () => {
      const mockBooking = {
        id: 'b1',
        userId: 'u1',
        status: BookingStatus.PAID,
        bookedAt: new Date(),
        trip: {
          id: 't1',
          route: { name: 'Route A' },
          bus: { plateNumber: 'BUS-1' }
        },
        passengerDetails: [{ id: 'p1', fullName: 'John' }],
        seatStatuses: [{ id: 's1', state: 'BOOKED', seat: { seatCode: 'A1' } }]
      };

      mockBookingService.findBookingById.mockResolvedValueOnce(mockBooking);

      const result = await controller.getBookingDetails('b1', {});

      expect(mockBookingService.findBookingById).toHaveBeenCalledWith('b1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('b1');
      expect(result.data.trip.route.name).toBe('Route A');
    });
  });

  describe('getGuestBooking', () => {
    it('should call findBookingByGuest', async () => {
      const query = { contactEmail: 'test@example.com', contactPhone: '0123456789' };
      mockBookingService.findBookingByGuest.mockResolvedValueOnce({ id: 'b1' });

      const result = await controller.getGuestBooking(query);

      expect(mockBookingService.findBookingByGuest).toHaveBeenCalledWith(query);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('b1');
    });
  });

  describe('getUserBookings', () => {
    it('should call findBookingsByUser', async () => {
      const req = { user: { userId: 'u1' } };
      mockBookingService.findBookingsByUser.mockResolvedValueOnce([{ id: 'b1' }]);

      const result = await controller.getUserBookings(req);

      expect(mockBookingService.findBookingsByUser).toHaveBeenCalledWith('u1');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('confirmPayment', () => {
    it('should call service.confirmPayment', async () => {
      mockBookingService.confirmPayment.mockResolvedValueOnce({ id: 'b1', status: BookingStatus.PAID });

      const result = await controller.confirmPayment('b1', { method: 'CASH' });

      expect(mockBookingService.confirmPayment).toHaveBeenCalledWith('b1', { method: 'CASH' });
      expect(result.success).toBe(true);
    });
  });

  describe('cancelBooking', () => {
    it('should delegate to service', async () => {
      mockBookingService.cancelBooking.mockResolvedValueOnce({
        success: true,
        message: 'Cancelled'
      });

      const result = await controller.cancelBooking('b1', { reason: 'Test' });

      expect(mockBookingService.cancelBooking).toHaveBeenCalledWith('b1', 'Test');
      expect(result.success).toBe(true);
    });
  });

  describe('cleanupExpiredBookings (Admin)', () => {
    it('should trigger manual expiration from scheduler', async () => {
      mockExpirationScheduler.triggerManualExpiration.mockResolvedValueOnce({
        processed: 5,
        processingTimeMs: 100,
        sessionId: 'test-session',
        errors: []
      });

      const result = await controller.cleanupExpiredBookings();

      expect(mockExpirationScheduler.triggerManualExpiration).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.processed).toBe(5);
    });

    it('should handle failures gracefully', async () => {
      mockExpirationScheduler.triggerManualExpiration.mockRejectedValueOnce(new Error('Internal failure'));

      const result = await controller.cleanupExpiredBookings();

      expect(result.success).toBe(false);
      expect(result.message).toContain('failure');
    });
  });

  describe('e-Ticket Handling', () => {
    it('should download-ticket', async () => {
      const res = { set: jest.fn().mockReturnThis(), send: jest.fn() } as any;
      mockBookingService.generateEticketFile.mockResolvedValueOnce({
        buffer: Buffer.from('pdf'),
        filename: 'ticket.pdf'
      });

      await controller.downloadEticket('b1', res);

      expect(mockBookingService.generateEticketFile).toHaveBeenCalledWith('b1');
      expect(res.set).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    it('should send e-ticket email', async () => {
      mockBookingService.sendEticketEmail.mockResolvedValueOnce({ success: true });

      const result = await controller.sendEticketEmail('b1', { email: 't@t.com' });

      expect(mockBookingService.sendEticketEmail).toHaveBeenCalledWith('b1', 't@t.com');
      expect(result.success).toBe(true);
    });
  });
});