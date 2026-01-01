import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../../src/user/user.controller';
import { UserService } from '../../src/user/user.service';
import { BookingStatus } from '../../src/entities/booking.entity';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;

  const mockUserService = {
    getUserBookings: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: 'test-user-id',
      email: 'test@example.com',
    },
  };

  const mockBookingData = [
    {
      id: 'booking-1',
      userId: 'test-user-id',
      tripId: 'trip-1',
      totalAmount: 500000,
      status: BookingStatus.PAID,
      bookedAt: new Date('2025-12-01T08:00:00Z'),
      cancelledAt: null,
      expiresAt: null,
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
      passengers: [
        {
          id: 'passenger-1',
          fullName: 'Nguyen Van A',
          documentId: '123456789',
          seatCode: '1A',
        },
      ],
      seats: [
        {
          id: 'seat-status-1',
          seatId: 'seat-1',
          state: 'booked',
          lockedUntil: null,
          seat: {
            id: 'seat-1',
            seatCode: '1A',
            seatType: 'vip',
            isActive: true,
          },
        },
      ],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserBookings', () => {
    it('should return all user bookings when no status filter is provided', async () => {
      const mockResponse = {
        success: true,
        message: 'User bookings retrieved successfully',
        data: mockBookingData,
      };
      mockUserService.getUserBookings.mockResolvedValue(mockResponse);

      const result = await controller.getUserBookings(mockRequest);

      expect(mockUserService.getUserBookings).toHaveBeenCalledWith(
        'test-user-id',
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle service errors properly', async () => {
      const serviceError = new Error('Database connection failed');
      mockUserService.getUserBookings.mockRejectedValue(serviceError);

      await expect(controller.getUserBookings(mockRequest)).rejects.toThrow(serviceError);
      expect(mockUserService.getUserBookings).toHaveBeenCalledWith(
        'test-user-id',
        undefined,
      );
    });

    it('should extract userId from request object correctly', async () => {
      const customRequest = {
        user: {
          userId: 'different-user-id',
          email: 'different@example.com',
        },
      };
      mockUserService.getUserBookings.mockResolvedValue({
        success: true,
        message: 'User bookings retrieved successfully',
        data: [],
      });

      await controller.getUserBookings(customRequest);

      expect(mockUserService.getUserBookings).toHaveBeenCalledWith(
        'different-user-id',
        undefined,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockProfile = {
        success: true,
        data: {
          userId: 'test-user-id',
          email: 'test@example.com',
          phone: '123456789',
          fullName: 'Test User',
          role: 'customer',
          createdAt: new Date(),
        }
      };
      mockUserService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockRequest);

      expect(mockUserService.getProfile).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(mockProfile);
    });

    it('should handle service errors when fetching profile', async () => {
      const serviceError = new NotFoundException('User not found');
      mockUserService.getProfile.mockRejectedValue(serviceError);

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(serviceError);
      expect(mockUserService.getProfile).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateDto = {
        fullName: 'Updated Name',
        phone: '9876543210',
      };
      const mockResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: {
          userId: 'test-user-id',
          fullName: 'Updated Name',
          phone: '9876543210',
          email: 'test@example.com',
          role: 'customer',
          createdAt: new Date(),
        }
      };
      mockUserService.updateProfile.mockResolvedValue(mockResponse);

      const result = await controller.updateProfile(mockRequest, updateDto);

      expect(mockUserService.updateProfile).toHaveBeenCalledWith('test-user-id', updateDto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle partial updates', async () => {
      const updateDto = {
        fullName: 'New Name Only',
      };
      const mockResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: {
          userId: 'test-user-id',
          fullName: 'New Name Only',
          phone: '123456789',
          email: 'test@example.com',
          role: 'customer',
          createdAt: new Date(),
        }
      };
      mockUserService.updateProfile.mockResolvedValue(mockResponse);

      const result = await controller.updateProfile(mockRequest, updateDto);

      expect(mockUserService.updateProfile).toHaveBeenCalledWith('test-user-id', updateDto);
      expect(result.data.fullName).toBe('New Name Only');
    });

    it('should handle service errors when updating profile', async () => {
      const updateDto = { fullName: 'New Name' };
      const serviceError = new NotFoundException('User not found');
      mockUserService.updateProfile.mockRejectedValue(serviceError);

      await expect(controller.updateProfile(mockRequest, updateDto)).rejects.toThrow(serviceError);
      expect(mockUserService.updateProfile).toHaveBeenCalledWith('test-user-id', updateDto);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockResponse = {
        success: true,
        message: 'Password changed successfully',
      };
      mockUserService.changePassword.mockResolvedValue(mockResponse);

      const result = await controller.changePassword(mockRequest, changePasswordDto);

      expect(mockUserService.changePassword).toHaveBeenCalledWith('test-user-id', changePasswordDto);
      expect(result).toEqual(mockResponse);
    });

    it('should handle BadRequestException for Google users', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const serviceError = new BadRequestException({
        success: false,
        message: 'Password change is not available for Google accounts. Your account is linked to Google authentication.',
      });
      mockUserService.changePassword.mockRejectedValue(serviceError);

      await expect(controller.changePassword(mockRequest, changePasswordDto)).rejects.toThrow(serviceError);
      expect(mockUserService.changePassword).toHaveBeenCalledWith('test-user-id', changePasswordDto);
    });

    it('should handle BadRequestException for Facebook users', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const serviceError = new BadRequestException({
        success: false,
        message: 'Password change is not available for Facebook accounts. Your account is linked to Facebook authentication.',
      });
      mockUserService.changePassword.mockRejectedValue(serviceError);

      await expect(controller.changePassword(mockRequest, changePasswordDto)).rejects.toThrow(serviceError);
      expect(mockUserService.changePassword).toHaveBeenCalledWith('test-user-id', changePasswordDto);
    });

    it('should handle BadRequestException for phone users', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const serviceError = new BadRequestException({
        success: false,
        message: 'Password change is not available for your account. You signed up using phone number authentication.',
      });
      mockUserService.changePassword.mockRejectedValue(serviceError);

      await expect(controller.changePassword(mockRequest, changePasswordDto)).rejects.toThrow(serviceError);
      expect(mockUserService.changePassword).toHaveBeenCalledWith('test-user-id', changePasswordDto);
    });

    it('should handle BadRequestException when passwords do not match', async () => {
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'DifferentPass789!',
      };
      const serviceError = new BadRequestException({
        success: false,
        message: 'New password and confirm password do not match',
      });
      mockUserService.changePassword.mockRejectedValue(serviceError);

      await expect(controller.changePassword(mockRequest, changePasswordDto)).rejects.toThrow(serviceError);
      expect(mockUserService.changePassword).toHaveBeenCalledWith('test-user-id', changePasswordDto);
    });

    it('should handle UnauthorizedException when current password is incorrect', async () => {
      const changePasswordDto = {
        currentPassword: 'WrongPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const serviceError = new UnauthorizedException({
        success: false,
        message: 'Current password is incorrect',
      });
      mockUserService.changePassword.mockRejectedValue(serviceError);

      await expect(controller.changePassword(mockRequest, changePasswordDto)).rejects.toThrow(serviceError);
      expect(mockUserService.changePassword).toHaveBeenCalledWith('test-user-id', changePasswordDto);
    });

    it('should handle BadRequestException when new password is same as current', async () => {
      const changePasswordDto = {
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
        confirmPassword: 'SamePass123!',
      };
      const serviceError = new BadRequestException({
        success: false,
        message: 'New password must be different from your current password',
      });
      mockUserService.changePassword.mockRejectedValue(serviceError);

      await expect(controller.changePassword(mockRequest, changePasswordDto)).rejects.toThrow(serviceError);
      expect(mockUserService.changePassword).toHaveBeenCalledWith('test-user-id', changePasswordDto);
    });

    it('should extract userId from request correctly', async () => {
      const customRequest = {
        user: {
          userId: 'different-user-id',
          email: 'different@example.com',
        },
      };
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockResponse = {
        success: true,
        message: 'Password changed successfully',
      };
      mockUserService.changePassword.mockResolvedValue(mockResponse);

      await controller.changePassword(customRequest, changePasswordDto);

      expect(mockUserService.changePassword).toHaveBeenCalledWith('different-user-id', changePasswordDto);
    });
  });
});
