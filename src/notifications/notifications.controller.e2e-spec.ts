import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsModule } from './notifications.module';
import { AuthModule } from '../auth/auth.module'; // Needed for JwtAuthGuard
import { Notification, NotificationChannel, NotificationStatus } from '../entities/notification.entity';
import { User, UserRole } from '../entities/user.entity';
import { testDatabaseConfig } from '../config/test-database.config';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';

// Mocking external environment variables
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost/callback';

describe('NotificationsController (e2e)', () => {
  let app: INestApplication;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<User>;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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
        AuthModule, // Required for login to get token
        NotificationsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    notificationRepository = moduleFixture.get<Repository<Notification>>(getRepositoryToken(Notification));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

    // Cleanup & Setup User
    const entities = ['notifications', 'users', 'refresh_tokens'];
    for (const entity of entities) {
        try {
            await userRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
        } catch(e) {}
    }

    const passwordHash = await bcrypt.hash('Test1234!', 10);
    const user = await userRepository.save({
      email: 'notify-e2e@test.com',
      passwordHash,
      name: 'Notify E2E',
      phone: '0901112222',
      role: UserRole.CUSTOMER,
    });
    userId = user.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'notify-e2e@test.com', password: 'Test1234!' });

    userToken = (loginResponse.headers['set-cookie'] as any)
      ?.find((c: string) => c.startsWith('access_token='))
      ?.split(';')[0]
      ?.split('=')[1] || '';
  });

  afterAll(async () => {
    if (userRepository) {
      const entities = ['notifications', 'users', 'refresh_tokens'];
      for (const entity of entities) {
          try {
              await userRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
          } catch(e) {}
      }
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
      // Clear notifications only, keep user
      await notificationRepository.query('DELETE FROM "notifications"');
  });

  describe('GET /notifications', () => {
    it('should return empty list initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', [`access_token=${userToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return list of notifications', async () => {
        await notificationRepository.save({
            userId,
            title: 'Test',
            message: 'Hello',
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            template: 't',
            sentAt: new Date()
        });

        const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Cookie', [`access_token=${userToken}`])
        .expect(200);

        expect(response.body.data.length).toBe(1);
    });
  });

  describe('PUT /notifications/read-all', () => {
    it('should mark all as read', async () => {
        await notificationRepository.save({
            userId,
            title: 'Test',
            message: 'Hello',
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT, // Unread state for API logic usually maps SENT to unread
            template: 't',
            sentAt: new Date()
        });

        await request(app.getHttpServer())
            .put('/notifications/read-all')
            .set('Cookie', [`access_token=${userToken}`])
            .expect(200);

        const found = await notificationRepository.findOne({ where: { userId } });
        expect(found?.status).toBe(NotificationStatus.READ);
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should mark specific notification as read', async () => {
        const n = await notificationRepository.save({
            userId,
            title: 'Single',
            message: 'One',
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            template: 't',
            sentAt: new Date()
        });

        await request(app.getHttpServer())
            .put(`/notifications/${n.id}/read`)
            .set('Cookie', [`access_token=${userToken}`])
            .expect(200);
        
        const found = await notificationRepository.findOne({ where: { id: n.id } });
        expect(found?.status).toBe(NotificationStatus.READ);
    });
  });
});
