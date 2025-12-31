import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '../../src/user/user.service';
import { BookingService } from '../../src/booking/booking.service';
import { User, UserRole } from '../../src/entities/user.entity';
import { NotFoundException } from '@nestjs/common';

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
});
