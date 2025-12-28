import { Test, TestingModule } from '@nestjs/testing';
import { PayosService } from '../../src/payos/payos.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment, PaymentStatus } from '../../src/entities/payment.entity';
import { Booking, BookingStatus } from '../../src/entities/booking.entity';
import { SeatStatus, SeatState } from '../../src/entities/seat-status.entity';
import { SeatStatusGateway } from '../../src/gateways/seat-status.gateway';
import { BookingGateway } from '../../src/gateways/booking.gateway';
import { PayOS } from '@payos/node';

// Mock the PayOS library
jest.mock('@payos/node', () => {
  return {
    PayOS: jest.fn().mockImplementation(() => ({
      paymentRequests: {
        create: jest.fn(),
        get: jest.fn(),
        cancel: jest.fn(),
      },
      webhooks: {
        verify: jest.fn(),
      },
    })),
  };
});

describe('PayosService', () => {
  let service: PayosService;
  let paymentRepo: any;
  let bookingRepo: any;
  let seatStatusRepo: any;
  let seatStatusGateway: any;
  let bookingGateway: any;
  let mockPayosInstance: any;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        PAYOS_CLIENT_ID: 'test-client-id',
        PAYOS_API_KEY: 'test-api-key',
        PAYOS_CHECKSUM_KEY: 'test-checksum-key',
        PAYOS_RETURN_URL: 'http://return.url',
        PAYOS_CANCEL_URL: 'http://cancel.url',
      };
      return config[key];
    }),
  };

  const createMockRepo = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  });

  const mockGateway = {
    notifySeatsAvailable: jest.fn(),
    notifySeatBooked: jest.fn(),
    notifyBookingStatusChanged: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayosService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Payment), useValue: createMockRepo() },
        { provide: getRepositoryToken(Booking), useValue: createMockRepo() },
        { provide: getRepositoryToken(SeatStatus), useValue: createMockRepo() },
        { provide: SeatStatusGateway, useValue: mockGateway },
        { provide: BookingGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<PayosService>(PayosService);
    paymentRepo = module.get(getRepositoryToken(Payment));
    bookingRepo = module.get(getRepositoryToken(Booking));
    seatStatusRepo = module.get(getRepositoryToken(SeatStatus));
    seatStatusGateway = module.get(SeatStatusGateway);
    bookingGateway = module.get(BookingGateway);

    // Access the mocked PayOS instance stored in the service
    mockPayosInstance = (service as any).payos;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentLink', () => {
    it('should create a payment link and save payment record', async () => {
      const dto = {
        amount: 10000,
        description: 'Test Payment',
        bookingId: 'booking-1',
      };

      const mockPayOSResponse = {
        checkoutUrl: 'http://pay.os/link',
        orderCode: 12345,
        paymentLinkId: 'link-id',
        amount: 10000,
        status: 'PENDING',
      };

      mockPayosInstance.paymentRequests.create.mockResolvedValue(mockPayOSResponse);
      paymentRepo.create.mockReturnValue({ id: 'payment-1', ...dto });
      paymentRepo.save.mockResolvedValue({ id: 'payment-1' });

      const result = await service.createPaymentLink(dto);

      expect(mockPayosInstance.paymentRequests.create).toHaveBeenCalled();
      expect(paymentRepo.create).toHaveBeenCalled();
      expect(paymentRepo.save).toHaveBeenCalled();
      expect(result.checkoutUrl).toBe('http://pay.os/link');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment and update booking/seats', async () => {
      const orderCode = 12345;
      const paymentMock = { id: 'p1', bookingId: 'b1', payosOrderCode: orderCode };
      const seatMock = { id: 's1', tripId: 't1', seatId: 'seat-A1' };

      mockPayosInstance.paymentRequests.cancel.mockResolvedValue({ orderCode, status: 'CANCELLED' });
      paymentRepo.findOne.mockResolvedValue(paymentMock);
      seatStatusRepo.find.mockResolvedValue([seatMock]);

      await service.cancelPayment(orderCode);

      expect(mockPayosInstance.paymentRequests.cancel).toHaveBeenCalledWith(orderCode);
      expect(paymentRepo.update).toHaveBeenCalledWith({ payosOrderCode: orderCode }, { status: PaymentStatus.CANCELLED });
      expect(bookingRepo.update).toHaveBeenCalledWith({ id: 'b1' }, expect.objectContaining({ status: BookingStatus.CANCELLED }));
      expect(seatStatusRepo.update).toHaveBeenCalledWith({ bookingId: 'b1' }, expect.objectContaining({ state: SeatState.AVAILABLE }));
      expect(seatStatusGateway.notifySeatsAvailable).toHaveBeenCalledWith('t1', ['seat-A1']);
    });
  });

  describe('handleWebhook', () => {
    it('should handle successful payment webhook', async () => {
      const webhookData = {
        orderCode: 12345,
        code: '00', // Success
        amount: 10000,
      } as any;

      const paymentMock = { id: 'p1', bookingId: 'b1' };
      const bookingMock = { id: 'b1', tripId: 't1' };
      const seatMock = { id: 's1', tripId: 't1', seatId: 'seat-A1' };

      paymentRepo.findOne.mockResolvedValue(paymentMock);
      bookingRepo.findOne.mockResolvedValue(bookingMock);
      seatStatusRepo.find.mockResolvedValue([seatMock]);

      const result = await service.handleWebhook(webhookData);

      expect(paymentRepo.update).toHaveBeenCalledWith({ payosOrderCode: 12345 }, { status: PaymentStatus.COMPLETED });
      expect(bookingRepo.update).toHaveBeenCalledWith({ id: 'b1' }, { status: BookingStatus.PAID });
      expect(seatStatusRepo.update).toHaveBeenCalledWith({ bookingId: 'b1' }, expect.objectContaining({ state: SeatState.BOOKED }));
      expect(bookingGateway.notifyBookingStatusChanged).toHaveBeenCalled();
      expect(seatStatusGateway.notifySeatBooked).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle failed payment webhook', async () => {
      const webhookData = {
        orderCode: 12345,
        code: '01', // Failure
      } as any;

      paymentRepo.findOne.mockResolvedValue({ id: 'p1', bookingId: 'b1' });
      bookingRepo.findOne.mockResolvedValue({ id: 'b1' });
      seatStatusRepo.find.mockResolvedValue([{ tripId: 't1', seatId: 's1' }]);

      await service.handleWebhook(webhookData);

      expect(paymentRepo.update).toHaveBeenCalledWith({ payosOrderCode: 12345 }, { status: PaymentStatus.FAILED });
      expect(bookingRepo.update).toHaveBeenCalledWith({ id: 'b1' }, expect.objectContaining({ status: BookingStatus.CANCELLED }));
      expect(seatStatusRepo.update).toHaveBeenCalledWith({ bookingId: 'b1' }, expect.objectContaining({ state: SeatState.AVAILABLE }));
    });
  });
});
