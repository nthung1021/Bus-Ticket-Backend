import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from './auth.module';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { testDatabaseConfig } from '../config/test-database.config';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;

  // Test data
  const testUser = {
    email: 'test@example.com',
    password: 'Test1234!@#$',
    fullName: 'Test User',
    phone: '+84901234567',
  };

  const adminUser = {
    email: 'minh@gmail.com',
    password: 'Admin1234!@#$',
    fullName: 'Admin User',
    phone: '+84901234568',
  };

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
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply validation pipe to match production behavior
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Get repositories for cleanup
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    refreshTokenRepository = moduleFixture.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
  });

  afterAll(async () => {
    // Clean up all test data
    await refreshTokenRepository.delete({});
    await userRepository.delete({});
    await app.close();
  });

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    await refreshTokenRepository.delete({});
    await userRepository.delete({});
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'registration successful');
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('fullName', testUser.fullName);
      expect(response.body.data).toHaveProperty('phone', testUser.phone);
      expect(response.body.data).toHaveProperty('role', 'customer');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('createdAt');

      // Verify user was saved in database
      const user = await userRepository.findOne({
        where: { email: testUser.email },
      });
      expect(user).toBeDefined();
      expect(user?.name).toBe(testUser.fullName);
      expect(user?.role).toBe('customer');
    });

    it('should assign admin role to minh@gmail.com', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(adminUser)
        .expect(201);

      expect(response.body.data).toHaveProperty('role', 'admin');

      // Verify admin role in database
      const user = await userRepository.findOne({
        where: { email: adminUser.email },
      });
      expect(user?.role).toBe('admin');
    });

    it('should reject duplicate email registration', async () => {
      // Register first time
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      // Try to register again with same email
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.message).toContain('Email already in use');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          password: 'weak',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testUser.email,
          // Missing password, fullName, phone
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(testUser.password, salt);
      await userRepository.save({
        email: testUser.email,
        passwordHash,
        name: testUser.fullName,
        phone: testUser.phone,
        role: 'customer',
      } as User);
    });

    it('should login successfully and set cookies', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      expect(response.body.data.user).toHaveProperty('fullName', testUser.fullName);
      expect(response.body.data.user).toHaveProperty('userId');
      expect(response.body.data.user).toHaveProperty('role');

      // Check that cookies are set
      const cookies = response.headers['set-cookie'] || [];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieArray.length).toBeGreaterThan(0);
      expect(cookieArray.some((cookie: string) => cookie.includes('access_token'))).toBe(true);
      expect(cookieArray.some((cookie: string) => cookie.includes('refresh_token'))).toBe(true);

      // Verify refresh token was saved in database
      const tokens = await refreshTokenRepository.find();
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should reject invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          // Missing password
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/refresh-token', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get refresh token
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(testUser.password, salt);
      const user = await userRepository.save({
        email: testUser.email,
        passwordHash,
        name: testUser.fullName,
        phone: testUser.phone,
        role: 'customer',
      } as User);

      userId = user.id;

      // Login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      // Extract refresh token from cookies
      const cookies = loginResponse.headers['set-cookie'] || [];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const refreshTokenCookie = cookieArray.find((cookie: string) =>
        cookie.startsWith('refresh_token='),
      );
      refreshToken = refreshTokenCookie
        ? refreshTokenCookie.split(';')[0].split('=')[1]
        : '';
    });

    it('should refresh tokens successfully using cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('userId', userId);

      // Check new cookies are set
      const cookies = response.headers['set-cookie'] || [];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      expect(cookieArray.length).toBeGreaterThan(0);
      expect(cookieArray.some((cookie: string) => cookie.includes('access_token'))).toBe(true);
      expect(cookieArray.some((cookie: string) => cookie.includes('refresh_token'))).toBe(true);
    });

    it('should refresh tokens successfully using body', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject request without refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({})
        .expect(401);

      expect(response.body.message).toContain('Refresh token not found');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(403);

      expect(response.body.message).toBeDefined();
    });

    it('should rotate refresh token (old one becomes invalid)', async () => {
      // First refresh
      const firstResponse = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(200);

      const firstCookies = firstResponse.headers['set-cookie'] || [];
      const firstCookieArray = Array.isArray(firstCookies) ? firstCookies : [firstCookies];
      const newRefreshToken = firstCookieArray
        .find((cookie: string) => cookie.startsWith('refresh_token='))
        ?.split(';')[0]
        .split('=')[1];

      // Old token should be invalid
      const secondResponse = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(403);

      // New token should work
      const thirdResponse = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', [`refresh_token=${newRefreshToken}`])
        .expect(200);

      expect(thirdResponse.body).toHaveProperty('success', true);
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and login
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(testUser.password, salt);
      await userRepository.save({
        email: testUser.email,
        passwordHash,
        name: testUser.fullName,
        phone: testUser.phone,
        role: 'customer',
      } as User);

      // Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      const cookies = loginResponse.headers['set-cookie'] || [];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const accessTokenCookie = cookieArray.find((cookie: string) =>
        cookie.startsWith('access_token='),
      );
      accessToken = accessTokenCookie
        ? accessTokenCookie.split(';')[0].split('=')[1]
        : '';
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('fullName', testUser.fullName);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('role', 'customer');
    });

    it('should reject request without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', ['access_token=invalid-token'])
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully and clear cookies', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');

      // Check that cookies are cleared
      const cookies = response.headers['set-cookie'] || [];
      const cookieArray = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
      if (cookieArray.length > 0) {
        const accessTokenCookie = cookieArray.find((cookie: string) =>
          cookie.includes('access_token'),
        );
        const refreshTokenCookie = cookieArray.find((cookie: string) =>
          cookie.includes('refresh_token'),
        );
        
        // Cookies should be cleared (maxAge=0 or expires in past)
        if (accessTokenCookie) {
          expect(accessTokenCookie).toContain('Max-Age=0');
        }
        if (refreshTokenCookie) {
          expect(refreshTokenCookie).toContain('Max-Age=0');
        }
      }
    });
  });

  describe('Full authentication flow', () => {
    it('should complete full flow: register -> login -> get me -> refresh -> logout', async () => {
      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'flow@example.com',
          password: 'Flow1234!@#$',
          fullName: 'Flow User',
          phone: '+84901234569',
        })
        .expect(201);

      const userId = registerResponse.body.data.userId;

      // 2. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'flow@example.com',
          password: 'Flow1234!@#$',
        })
        .expect(200);

      const loginCookies = loginResponse.headers['set-cookie'] || [];
      const loginCookieArray = Array.isArray(loginCookies) ? loginCookies : [loginCookies];
      const accessToken = loginCookieArray
        .find((cookie: string) => cookie.startsWith('access_token='))
        ?.split(';')[0]
        .split('=')[1];
      const refreshToken = loginCookieArray
        .find((cookie: string) => cookie.startsWith('refresh_token='))
        ?.split(';')[0]
        .split('=')[1];

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // 3. Get current user
      const meResponse = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      expect(meResponse.body.data.userId).toBe(userId);

      // 4. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Cookie', [`refresh_token=${refreshToken}`])
        .expect(200);

      expect(refreshResponse.body.data.user.userId).toBe(userId);

      const refreshCookies = refreshResponse.headers['set-cookie'] || [];
      const refreshCookieArray = Array.isArray(refreshCookies) ? refreshCookies : [refreshCookies];
      const newAccessToken = refreshCookieArray
        .find((cookie: string) => cookie.startsWith('access_token='))
        ?.split(';')[0]
        .split('=')[1];

      // 5. Use new access token
      const meResponse2 = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`access_token=${newAccessToken}`])
        .expect(200);

      expect(meResponse2.body.data.userId).toBe(userId);

      // 6. Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });
  });
});

