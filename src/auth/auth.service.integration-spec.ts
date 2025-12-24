import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtConfigService } from '../config/jwt.config.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles/roles.guard';
import { testDatabaseConfig } from '../config/test-database.config';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthService (integration)', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;

  const testUser: SignUpDto = {
    email: 'test@example.com',
    password: 'Test1234!@#$',
    fullName: 'Test User',
    phone: '+84901234567',
  };

  const adminUser: SignUpDto = {
    email: 'minh@gmail.com',
    password: 'Admin1234!@#$',
    fullName: 'Admin User',
    phone: '+84901234568',
  };

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
        TypeOrmModule.forFeature([User, RefreshToken]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useClass: JwtConfigService,
          inject: [ConfigService],
        }),
      ],
      providers: [
        AuthService,
        JwtStrategy,
        RolesGuard,
        JwtAuthGuard,
        JwtConfigService,
        GoogleStrategy,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
  });

  afterAll(async () => {
    await refreshTokenRepository.delete({});
    await userRepository.delete({});
  });

  beforeEach(async () => {
    // Clean up before each test
    await refreshTokenRepository.delete({});
    await userRepository.delete({});
  });

  describe('signUp', () => {
    it('should create a new user with hashed password', async () => {
      const result = await service.signUp(testUser);

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('email', testUser.email);
      expect(result.data).toHaveProperty('fullName', testUser.fullName);
      expect(result.data).toHaveProperty('phone', testUser.phone);
      expect(result.data).toHaveProperty('role', 'customer');
      expect(result.data).toHaveProperty('userId');
      expect(result.data).toHaveProperty('createdAt');

      // Verify user in database
      const user = await userRepository.findOne({
        where: { email: testUser.email },
      });
      expect(user).toBeDefined();
      expect(user?.name).toBe(testUser.fullName);
      expect(user?.passwordHash).not.toBe(testUser.password);
      
      // Verify password is hashed
      const isValid = await bcrypt.compare(testUser.password, user!.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should assign admin role to minh@gmail.com', async () => {
      const result = await service.signUp(adminUser);

      expect(result.data).toHaveProperty('role', 'admin');

      const user = await userRepository.findOne({
        where: { email: adminUser.email },
      });
      expect(user?.role).toBe(UserRole.ADMIN);
    });

    it('should throw ConflictException for duplicate email', async () => {
      await service.signUp(testUser);

      await expect(service.signUp(testUser)).rejects.toThrow(ConflictException);
      await expect(service.signUp(testUser)).rejects.toThrow('Email already in use');
    });

    it('should create user with customer role by default', async () => {
      const customUser: SignUpDto = {
        email: 'customer@example.com',
        password: 'Customer1234!@#$',
        fullName: 'Customer User',
        phone: '+84901234569',
      };

      const result = await service.signUp(customUser);
      expect(result.data.role).toBe('customer');

      const user = await userRepository.findOne({
        where: { email: customUser.email },
      });
      expect(user?.role).toBe(UserRole.CUSTOMER);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create user for login tests
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(testUser.password, salt);
      await userRepository.save({
        email: testUser.email,
        passwordHash,
        name: testUser.fullName,
        phone: testUser.phone,
        role: UserRole.CUSTOMER,
      } as User);
    });

    it('should login successfully and return tokens', async () => {
      const loginDto: LoginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('accessToken');
      expect(result.data).toHaveProperty('refreshToken');
      expect(result.data).toHaveProperty('user');
      expect(result.data.user).toHaveProperty('email', testUser.email);
      expect(result.data.user).toHaveProperty('fullName', testUser.fullName);
      expect(result.data.user).toHaveProperty('userId');
      expect(result.data.user).toHaveProperty('role', 'customer');

      // Verify refresh token was saved
      const tokens = await refreshTokenRepository.find();
      expect(tokens.length).toBe(1);
      expect(tokens[0].token).toBe(result.data.refreshToken);
    });

    it('should throw BadRequestException for invalid email', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: testUser.password,
      };

      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw BadRequestException for invalid password', async () => {
      const loginDto: LoginDto = {
        email: testUser.email,
        password: 'WrongPassword123!',
      };

      await expect(service.login(loginDto)).rejects.toThrow(BadRequestException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should create refresh token in database on login', async () => {
      const loginDto: LoginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      const result = await service.login(loginDto);

      const tokens = await refreshTokenRepository.find({
        where: { userId: result.data.user.userId },
      });

      expect(tokens.length).toBe(1);
      expect(tokens[0].token).toBe(result.data.refreshToken);
      expect(tokens[0].expiresAt).toBeDefined();
      expect(new Date(tokens[0].expiresAt) > new Date()).toBe(true);
    });
  });

  describe('refreshToken', () => {
    let user: User;
    let refreshToken: string;

    beforeEach(async () => {
      // Create user
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(testUser.password, salt);
      user = await userRepository.save({
        email: testUser.email,
        passwordHash,
        name: testUser.fullName,
        phone: testUser.phone,
        role: UserRole.CUSTOMER,
      } as User);

      // Login to get refresh token
      const loginResult = await service.login({
        email: testUser.email,
        password: testUser.password,
      });
      refreshToken = loginResult.data.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('accessToken');
      expect(result.data).toHaveProperty('refreshToken');
      expect(result.data).toHaveProperty('user');
      expect(result.data.user).toHaveProperty('userId', user.id);
      expect(result.data.user).toHaveProperty('email', user.email);
    });

    it('should rotate refresh token (old one deleted)', async () => {
      const oldToken = refreshToken;

      const result = await service.refreshToken(refreshToken);

      // Old token should be deleted
      const oldTokenRecord = await refreshTokenRepository.findOne({
        where: { token: oldToken },
      });
      expect(oldTokenRecord).toBeNull();

      // New token should exist
      const newTokenRecord = await refreshTokenRepository.findOne({
        where: { token: result.data.refreshToken },
      });
      expect(newTokenRecord).toBeDefined();
      expect(newTokenRecord?.token).not.toBe(oldToken);
    });

    it('should throw ForbiddenException for invalid token', async () => {
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for expired token', async () => {
      // Create an expired token manually
      const expiredToken = await refreshTokenRepository.save({
        token: 'expired-token',
        userId: user.id,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      } as RefreshToken);

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        'Refresh token has expired',
      );

      // Verify expired token was deleted
      const tokenRecord = await refreshTokenRepository.findOne({
        where: { id: expiredToken.id },
      });
      expect(tokenRecord).toBeNull();
    });

    it('should throw ForbiddenException for non-existent token', async () => {
      // Create a valid JWT token but not in database
      const { JwtService } = await import('@nestjs/jwt');
      const jwtService = new JwtService();
      const fakeToken = jwtService.sign(
        { sub: user.id },
        { secret: 'fake-secret', expiresIn: '7d' },
      );

      await expect(service.refreshToken(fakeToken)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('googleLogin', () => {
    it('should create new user for first-time Google login', async () => {
      const googleProfile = {
        googleId: 'google-123',
        email: 'google@example.com',
        name: 'Google User',
      };

      const result = await service.googleLogin(googleProfile);

      expect(result).toHaveProperty('success', true);
      expect(result?.data).toHaveProperty('accessToken');
      expect(result?.data).toHaveProperty('refreshToken');
      expect(result?.data.user).toHaveProperty('email', googleProfile.email);
      expect(result?.data.user).toHaveProperty('fullName', googleProfile.name);

      // Verify user was created
      const user = await userRepository.findOne({
        where: { googleId: googleProfile.googleId },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe(googleProfile.email);
    });

    it('should login existing Google user', async () => {
      // Create existing Google user
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash('random', salt);
      const existingUser = await userRepository.save({
        googleId: 'google-456',
        email: 'existing@example.com',
        name: 'Existing User',
        passwordHash,
        role: UserRole.CUSTOMER,
      } as User);

      const googleProfile = {
        googleId: 'google-456',
        email: 'existing@example.com',
        name: 'Existing User',
      };

      const result = await service.googleLogin(googleProfile);

      expect(result).toHaveProperty('success', true);
      expect(result?.data.user).toHaveProperty('userId', existingUser.id);
    });

    it('should return null for invalid profile', async () => {
      const result = await service.googleLogin(null);
      expect(result).toBeNull();

      const result2 = await service.googleLogin({});
      expect(result2).toBeNull();
    });

    it('should assign admin role to minh@gmail.com via Google', async () => {
      const googleProfile = {
        googleId: 'google-admin',
        email: 'minh@gmail.com',
        name: 'Admin User',
      };

      const result = await service.googleLogin(googleProfile);

      expect(result?.data.user.role).toBe('admin');

      const user = await userRepository.findOne({
        where: { googleId: googleProfile.googleId },
      });
      expect(user?.role).toBe(UserRole.ADMIN);
    });
  });

  describe('Database integrity', () => {
    it('should store password as hash, not plain text', async () => {
      await service.signUp(testUser);

      const user = await userRepository.findOne({
        where: { email: testUser.email },
      });

      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(testUser.password);
      expect(user?.passwordHash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('should create refresh token with proper expiration', async () => {
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(testUser.password, salt);
      const user = await userRepository.save({
        email: testUser.email,
        passwordHash,
        name: testUser.fullName,
        phone: testUser.phone,
        role: UserRole.CUSTOMER,
      } as User);

      const loginResult = await service.login({
        email: testUser.email,
        password: testUser.password,
      });

      const token = await refreshTokenRepository.findOne({
        where: { token: loginResult.data.refreshToken },
      });

      expect(token).toBeDefined();
      expect(token?.userId).toBe(user.id);
      expect(token?.expiresAt).toBeDefined();
      
      // Token should expire in the future (7 days)
      const expirationDate = new Date(token!.expiresAt);
      const now = new Date();
      const daysUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysUntilExpiration).toBeGreaterThan(6);
      expect(daysUntilExpiration).toBeLessThan(8);
    });

    it('should maintain referential integrity between User and RefreshToken', async () => {
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(testUser.password, salt);
      const user = await userRepository.save({
        email: testUser.email,
        passwordHash,
        name: testUser.fullName,
        phone: testUser.phone,
        role: UserRole.CUSTOMER,
      } as User);

      const loginResult = await service.login({
        email: testUser.email,
        password: testUser.password,
      });

      const token = await refreshTokenRepository.findOne({
        where: { token: loginResult.data.refreshToken },
        relations: ['user'],
      });

      expect(token?.user).toBeDefined();
      expect(token?.user.id).toBe(user.id);
      expect(token?.user.email).toBe(user.email);
    });
  });
});

