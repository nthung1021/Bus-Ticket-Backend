import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { User } from '../../src/entities/user.entity';
import { Notification, NotificationChannel, NotificationStatus } from '../../src/entities/notification.entity';
import { Booking } from '../../src/entities/booking.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import { BookingService } from '../../src/booking/booking.service';
import { EmailService } from '../../src/booking/email.service';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('NotificationsService (integration)', () => {
  let service: NotificationsService;
  let moduleRef: TestingModule;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) =>
            testDatabaseConfig(configService),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([Notification, User, Booking]),
      ],
      providers: [
        NotificationsService,
        {
          provide: BookingService,
          useValue: {
            findUpcomingPaidBookings: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    moduleRef = module;
    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<Repository<Notification>>(getRepositoryToken(Notification));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  beforeEach(async () => {
    const entities = [
      'notifications',
      'bookings',
      'users'
    ];
    for (const entity of entities) {
      try {
        await userRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
      } catch (e) { }
    }
  });

  async function createUser() {
    return await userRepository.save({
      email: `notify-user-${crypto.randomUUID()}@test.com`,
      name: 'Notification User',
      phone: '0901234567',
      passwordHash: 'hash',
    });
  }

  describe('createInAppNotification', () => {
    it('should create an in-app notification', async () => {
      const user = await createUser();
      const title = 'Test Notification';
      const message = 'This is a test message';
      const data = { foo: 'bar' };

      const result = await service.createInAppNotification(
        user.id,
        title,
        message,
        data
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(user.id);
      expect(result.channel).toBe(NotificationChannel.IN_APP);
      expect(result.status).toBe(NotificationStatus.SENT);
      expect(result.data).toEqual(data);
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const user = await createUser();
      // Create a few notifications
      await service.createInAppNotification(user.id, 'N1', 'Msg1');
      await service.createInAppNotification(user.id, 'N2', 'Msg2');

      const result = await service.getUserNotifications(user.id);

      expect(result.data.length).toBe(2);
      expect(result.pagination.total).toBe(2);
      // Check default sorting (latest first)
      expect(result.data[0].title).toBe('N2'); 
    });

    it('should filter by status (unread)', async () => {
      const user = await createUser();
      const n1 = await service.createInAppNotification(user.id, 'Unread', 'Msg');
      const n2 = await service.createInAppNotification(user.id, 'Read', 'Msg');

      // Manually mark n2 as read for setup
      await notificationRepository.update(n2.id, { status: NotificationStatus.READ });

      const result = await service.getUserNotifications(user.id, { status: 'unread' });

      expect(result.data.length).toBe(1);
      expect(result.data[0].notificationId).toBe(n1.id);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const user = await createUser();
      const n = await service.createInAppNotification(user.id, 'Test', 'Msg');

      const result = await service.markAsRead(n.id, user.id);

      expect(result.success).toBe(true);

      const updated = await notificationRepository.findOne({ where: { id: n.id } });
      expect(updated?.status).toBe(NotificationStatus.READ);
    });

    it('should throw NotFoundException if notification does not exist or belong to user', async () => {
      const user = await createUser();
      await expect(service.markAsRead(crypto.randomUUID(), user.id))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const user = await createUser();
      await service.createInAppNotification(user.id, 'N1', 'Msg1');
      await service.createInAppNotification(user.id, 'N2', 'Msg2');

      const result = await service.markAllAsRead(user.id);

      expect(result.success).toBe(true);

      const count = await notificationRepository.count({
        where: { userId: user.id, status: NotificationStatus.READ }
      });
      expect(count).toBe(2);
    });
  });
});
