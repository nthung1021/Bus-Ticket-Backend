import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../src/user/user.service';
import { BookingService } from '../../src/booking/booking.service';

describe('UserService', () => {
  let service: UserService;
  let bookingService: BookingService;

  const mockBookingService = {
    findBookingsByUserWithDetails: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    bookingService = module.get<BookingService>(BookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserBookings', () => {
    it('should call bookingService.findBookingsByUserWithDetails and return the result', async () => {
      const userId = 'user-1';
      const mockBookings = [{ id: 'booking-1' }];
      mockBookingService.findBookingsByUserWithDetails.mockResolvedValue(mockBookings);

      const result = await service.getUserBookings(userId);

      expect(mockBookingService.findBookingsByUserWithDetails).toHaveBeenCalledWith(userId, undefined);
      expect(result).toEqual({
        success: true,
        message: 'User bookings retrieved successfully',
        data: mockBookings,
      });
    });
  });
});
