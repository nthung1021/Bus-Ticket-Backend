import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification, NotificationChannel, NotificationStatus } from '../entities/notification.entity';
import { BookingService } from '../booking/booking.service';
import { EmailService } from '../booking/email.service';
import { NotFoundException } from '@nestjs/common';
import { Not } from 'typeorm';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: any;
  let bookingService: any;
  let emailService: any;

  const mockNotificationRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockBookingService = {
    findUpcomingPaidBookings: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const userId = 'user-1';
  const notificationFixture: Partial<Notification> = {
    id: 'notif-1',
    userId,
    title: 'Test Title',
    message: 'Test Message',
    status: NotificationStatus.SENT,
    sentAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepo,
        },
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get(getRepositoryToken(Notification));
    bookingService = module.get(BookingService);
    emailService = module.get(EmailService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleTripReminders', () => {
    it('should send reminders for upcoming bookings', async () => {
      const mockBooking = {
        id: 'book-1',
        user: { email: 'test@example.com' },
        trip: {
          departureTime: new Date(),
          route: { origin: 'A', destination: 'B' },
        },
      };

      bookingService.findUpcomingPaidBookings.mockResolvedValue([mockBooking]);
      repo.findOne.mockResolvedValue(null); // No existing notification
      emailService.sendEmail.mockResolvedValue(true);
      repo.save.mockResolvedValue({});

      await service.handleTripReminders();

      expect(bookingService.findUpcomingPaidBookings).toHaveBeenCalledWith(24);
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });

    it('should skip if reminder already sent', async () => {
      const mockBooking = { id: 'book-1' };
      bookingService.findUpcomingPaidBookings.mockResolvedValue([mockBooking]);
      repo.findOne.mockResolvedValue({ id: 'existing' });

      await service.handleTripReminders();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      repo.findAndCount.mockResolvedValue([[notificationFixture], 1]);

      const result = await service.getUserNotifications(userId);

      expect(repo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId },
      }));
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by status unread', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.getUserNotifications(userId, { status: 'unread' });

      expect(repo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId, status: Not(NotificationStatus.READ) },
      }));
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      repo.findOne.mockResolvedValue(notificationFixture);
      repo.save.mockResolvedValue({ ...notificationFixture, status: NotificationStatus.READ });

      const result = await service.markAsRead('notif-1', userId);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'notif-1', userId } });
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if notification not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('notif-1', userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      repo.update.mockResolvedValue({ affected: 5 });

      const result = await service.markAllAsRead(userId);

      expect(repo.update).toHaveBeenCalledWith(
        { userId, status: Not(NotificationStatus.READ) },
        { status: NotificationStatus.READ }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('createInAppNotification', () => {
    it('should create and save an in-app notification', async () => {
      repo.create.mockReturnValue(notificationFixture);
      repo.save.mockResolvedValue(notificationFixture);

      const result = await service.createInAppNotification(userId, 'Title', 'Message');

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        channel: NotificationChannel.IN_APP,
      }));
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(notificationFixture);
    });
  });
});
