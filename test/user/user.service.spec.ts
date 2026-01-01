import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '../../src/user/user.service';
import { BookingService } from '../../src/booking/booking.service';
import { User, UserRole } from '../../src/entities/user.entity';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let bookingService: BookingService;
  let userRepository: any;

  const mockBookingService = {
    findBookingsByUserWithDetails: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    bookingService = module.get<BookingService>(BookingService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  describe('getProfile', () => {
    it('should return user profile when user exists', async () => {
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '123456789',
        name: 'Test user',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(result).toEqual({
        success: true,
        data: {
          userId: mockUser.id,
          email: mockUser.email,
          phone: mockUser.phone,
          fullName: mockUser.name,
          role: mockUser.role,
          createdAt: mockUser.createdAt,
        }
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'non-existent';
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-1';
      const updateDto = {
        fullName: 'Updated Name',
        phone: '9876543210',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '123456789',
        name: 'Test user',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
      };
      const updatedUser = {
        ...mockUser,
        name: updateDto.fullName,
        phone: updateDto.phone,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, updateDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        name: updateDto.fullName,
        phone: updateDto.phone,
      });
      expect(result).toEqual({
        success: true,
        message: 'Profile updated successfully',
        data: {
          userId: updatedUser.id,
          fullName: updatedUser.name,
          phone: updatedUser.phone,
          email: updatedUser.email,
          role: updatedUser.role,
          createdAt: updatedUser.createdAt,
        }
      });
    });

    it('should update only fullName when phone is not provided', async () => {
      const userId = 'user-1';
      const updateDto = {
        fullName: 'Updated Name',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        phone: '123456789',
        name: 'Test user',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
      };
      const updatedUser = {
        ...mockUser,
        name: updateDto.fullName,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile(userId, updateDto);

      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        name: updateDto.fullName,
      });
      expect(result.data.fullName).toBe(updateDto.fullName);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'non-existent';
      const updateDto = { fullName: 'New Name' };
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile(userId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully for email/password user', async () => {
      const userId = 'user-1';
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashedOldPassword',
        googleId: null,
        facebookId: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // current password valid
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false); // new password different
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      mockUserRepository.save.mockResolvedValue({ ...mockUser, passwordHash: 'hashedNewPassword' });

      const result = await service.changePassword(userId, changePasswordDto);

      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully',
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for Google user', async () => {
      const userId = 'user-1';
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        googleId: 'google-123',
        facebookId: null,
        passwordHash: 'someHash',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for Facebook user', async () => {
      const userId = 'user-1';
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        googleId: null,
        facebookId: 'facebook-123',
        passwordHash: 'someHash',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for phone user without password', async () => {
      const userId = 'user-1';
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockUser = {
        id: userId,
        phone: '+84123456789',
        googleId: null,
        facebookId: null,
        passwordHash: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const userId = 'user-1';
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'DifferentPass789!',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashedOldPassword',
        googleId: null,
        facebookId: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      const userId = 'user-1';
      const changePasswordDto = {
        currentPassword: 'WrongPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashedOldPassword',
        googleId: null,
        facebookId: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when new password is same as current', async () => {
      const userId = 'user-1';
      const changePasswordDto = {
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
        confirmPassword: 'SamePass123!',
      };
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        googleId: null,
        facebookId: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // both comparisons return true

      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(BadRequestException);
    });
  });
});
