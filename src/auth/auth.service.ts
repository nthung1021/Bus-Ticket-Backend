import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtConfigService } from '../config/jwt.config.service';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/phone-otp.dto';

// Enhanced Google profile type with provider mapping
type GoogleProfile = {
  googleId: string; // provider_user_id
  email?: string;
  name?: string;
  avatar?: string;
  provider: 'google';
};

// Enhanced Facebook profile type with provider mapping
type FacebookProfile = {
  facebookId: string; // provider_user_id
  email?: string;
  name?: string;
  avatar?: string;
  provider: 'facebook';
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  // DEV/DEMO OTP storage - In production, use Redis or database with TTL
  private readonly otpStore = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private jwtConfigService: JwtConfigService,
  ) { }

  /**
   * Helper method to determine user role based on email
   */
  private determineUserRole(email: string): UserRole {
    // Auto-assign admin role to specific email
    if (email === 'minh@gmail.com') {
      return UserRole.ADMIN;
    }
    return UserRole.CUSTOMER;
  }

  /**
   * Google OAuth login handler with enhanced user linking logic
   * Maps Google profile to internal user with proper provider tracking
   */
  async googleLogin(profile?: GoogleProfile | null) {
    if (!profile || !profile.googleId) {
      this.logger.warn('Google login attempt with invalid profile');
      return null;
    }

    this.logger.log(`Google OAuth login attempt for email: ${profile.email}`);

    let existingUser: User | null = null;

    // Step 1: Check if provider_user_id (googleId) already exists
    if (profile.googleId) {
      existingUser = await this.usersRepository.findOne({
        where: { googleId: profile.googleId },
      });
      
      if (existingUser) {
        this.logger.log(`Existing Google user found: ${existingUser.id}`);
        return this.generateAuthResponse(existingUser, 'google_login_existing');
      }
    }

    // Step 2: Check if email exists (link Google account to existing user)
    if (profile.email) {
      existingUser = await this.usersRepository.findOne({
        where: { email: profile.email },
      });

      if (existingUser) {
        // Link Google account to existing email user
        this.logger.log(`Linking Google account to existing user: ${existingUser.id}`);
        existingUser.googleId = profile.googleId;
        await this.usersRepository.save(existingUser);
        
        return this.generateAuthResponse(existingUser, 'google_account_linked');
      }
    }

    // Step 3: Create new user with Google profile
    this.logger.log(`Creating new user from Google profile`);
    
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(Math.random().toString(), salt);
    const userRole = this.determineUserRole(profile.email || '');

    existingUser = this.usersRepository.create({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name || 'Google User',
      passwordHash: passwordHash,
      role: userRole,
    } as Partial<User> as User);

    await this.usersRepository.save(existingUser);
    this.logger.log(`New Google user created: ${existingUser.id}`);

    return this.generateAuthResponse(existingUser, 'google_user_created');
  }

  /**
   * Facebook OAuth login handler with enhanced user linking logic
   * Maps Facebook profile to internal user with proper provider tracking
   */
  async facebookLogin(profile?: FacebookProfile | null) {
    if (!profile || !profile.facebookId) {
      this.logger.warn('Facebook login attempt with invalid profile');
      return null;
    }

    this.logger.log(`Facebook OAuth login attempt for email: ${profile.email}`);

    let existingUser: User | null = null;

    // Step 1: Check if provider_user_id (facebookId) already exists
    if (profile.facebookId) {
      existingUser = await this.usersRepository.findOne({
        where: { facebookId: profile.facebookId },
      });
      
      if (existingUser) {
        this.logger.log(`Existing Facebook user found: ${existingUser.id}`);
        return this.generateAuthResponse(existingUser, 'facebook_login_existing');
      }
    }

    // Step 2: Check if email exists (link Facebook account to existing user)
    if (profile.email) {
      existingUser = await this.usersRepository.findOne({
        where: { email: profile.email },
      });

      if (existingUser) {
        // Link Facebook account to existing email user
        this.logger.log(`Linking Facebook account to existing user: ${existingUser.id}`);
        existingUser.facebookId = profile.facebookId;
        await this.usersRepository.save(existingUser);
        
        return this.generateAuthResponse(existingUser, 'facebook_account_linked');
      }
    }

    // Step 3: Create new user with Facebook profile
    this.logger.log(`Creating new user from Facebook profile`);
    
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(Math.random().toString(), salt);
    const userRole = this.determineUserRole(profile.email || '');

    existingUser = this.usersRepository.create({
      facebookId: profile.facebookId,
      email: profile.email,
      name: profile.name || 'Facebook User',
      passwordHash: passwordHash,
      role: userRole,
    } as Partial<User> as User);

    await this.usersRepository.save(existingUser);
    this.logger.log(`New Facebook user created: ${existingUser.id}`);

    return this.generateAuthResponse(existingUser, 'facebook_user_created');
  }

  /**
   * Generate authentication response with logging
   */
  private async generateAuthResponse(user: User, event: string) {
    const { accessToken, refreshToken } = await this.generateAndStoreTokens(user);
    
    const provider = event.includes('google') ? 'Google' : 
                    event.includes('facebook') ? 'Facebook' : 'OAuth';
    
    this.logger.log(`${provider} OAuth ${event} for user: ${user.id}`);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          userId: user.id,
          email: user.email,
          fullName: user.name,
          role: user.role,
        },
      },
    };
  }

  async signUp(signUpDto: SignUpDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: signUpDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(signUpDto.password, salt);

    // Determine role based on email
    const userRole = this.determineUserRole(signUpDto.email);

    const user = this.usersRepository.create({
      email: signUpDto.email,
      passwordHash: hashedPassword,
      name: signUpDto.fullName,
      phone: signUpDto.phone,
      role: userRole,
    } as Partial<User> as User);

    const savedUser = await this.usersRepository.save(user);

    return {
      success: true,
      data: {
        userId: savedUser.id,
        email: savedUser.email,
        phone: savedUser.phone,
        fullName: savedUser.name,
        role: savedUser.role,
        createdAt: savedUser.createdAt,
      },
      message: 'registration successful',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    // Handle phone-only users who don't have passwords
    if (!user.passwordHash) {
      throw new BadRequestException('Invalid credentials - phone users should use OTP login');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const { accessToken, refreshToken } =
      await this.generateAndStoreTokens(user);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          userId: user.id,
          email: user.email || '',
          fullName: user.name,
          role: user.role,
        },
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      // verify will throw if token invalid/expired — we don't need the payload variable here
      this.jwtService.verify(refreshToken, {
        secret: this.jwtConfigService.refreshTokenSecret,
      });

      const storedToken = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken },
        relations: ['user'],
      });

      if (!storedToken) {
        throw new ForbiddenException('Invalid refresh token');
      }

      if (storedToken.expiresAt < new Date()) {
        await this.refreshTokenRepository.delete(storedToken.id);
        throw new ForbiddenException('Refresh token has expired');
      }

      const user = storedToken.user;
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const tokens = await this.generateAndStoreTokens(user);

      // rotate delete old token
      await this.refreshTokenRepository.delete(storedToken.id);

      return {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            userId: user.id,
            email: user.email || '',
            fullName: user.name,
            role: user.role,
          },
        },
      };
    } catch (err: unknown) {
      // narrow to check name safely
      const e = err as { name?: string } | undefined;
      if (e?.name === 'TokenExpiredError') {
        throw new ForbiddenException('Refresh token has expired');
      }
      throw err;
    }
  }

  private async generateAndStoreTokens(user: User) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email || '',
        fullName: user.name,
        role: user.role,
      },
      {
        secret: this.jwtConfigService.accessTokenSecret,
        expiresIn: this.jwtConfigService.getExpirationInSeconds(
          this.jwtConfigService.accessTokenExpiration,
        ),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.jwtConfigService.refreshTokenSecret,
        expiresIn: this.jwtConfigService.getExpirationInSeconds(
          this.jwtConfigService.refreshTokenExpiration,
        ),
      },
    );

    const expirationInSeconds = this.jwtConfigService.getExpirationInSeconds(
      this.jwtConfigService.refreshTokenExpiration,
    );
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expirationInSeconds);

    const tokenEntity = this.refreshTokenRepository.create({
      token: refreshToken,
      userId: user.id,
      expiresAt,
    } as Partial<RefreshToken> as RefreshToken);
    await this.refreshTokenRepository.save(tokenEntity);

    return { accessToken, refreshToken };
  }

  /**
   * Phone/OTP Authentication - DEV/DEMO Mode
   * TODO: Replace with real SMS provider for production
   */

  /**
   * Send OTP to phone number (DEV mode - returns OTP in response)
   */
  async sendOtp(sendOtpDto: SendOtpDto) {
    const { phone } = sendOtpDto;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL
    
    // Store OTP with rate limiting
    const existingEntry = this.otpStore.get(phone);
    if (existingEntry && existingEntry.expiresAt > new Date()) {
      // OTP still valid, don't generate new one yet
      throw new BadRequestException('OTP already sent. Please wait before requesting again.');
    }
    
    // Store OTP in memory (DEV mode)
    this.otpStore.set(phone, {
      otp,
      expiresAt,
      attempts: 0
    });
    
    this.logger.log(`[DEV MODE] OTP generated for ${phone}: ${otp}`);
    
    // TODO: In production, integrate with SMS provider here
    // await this.smsService.sendOtp(phone, otp);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone,
        expiresAt,
        // DEV MODE: Return OTP in response for testing
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      },
    };
  }

  /**
   * Verify OTP and authenticate user
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phone, otp } = verifyOtpDto;
    
    // Get stored OTP
    const storedEntry = this.otpStore.get(phone);
    if (!storedEntry) {
      throw new BadRequestException('OTP not found or expired. Please request a new OTP.');
    }
    
    // Check expiration
    if (storedEntry.expiresAt < new Date()) {
      this.otpStore.delete(phone);
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }
    
    // Rate limiting - max 3 attempts
    if (storedEntry.attempts >= 3) {
      this.otpStore.delete(phone);
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }
    
    // Verify OTP
    if (storedEntry.otp !== otp) {
      storedEntry.attempts++;
      this.otpStore.set(phone, storedEntry);
      throw new BadRequestException(`Invalid OTP. ${3 - storedEntry.attempts} attempts remaining.`);
    }
    
    // OTP verified - clean up
    this.otpStore.delete(phone);
    this.logger.log(`[DEV MODE] OTP verified successfully for ${phone}`);
    
    // Find or create user by phone
    let user = await this.usersRepository.findOne({ where: { phone } });
    
    if (!user) {
      // Create new user with phone number
      const userRole = this.determineUserRole(''); // Default role for phone users
      user = this.usersRepository.create({
        phone,
        name: `User ${phone.slice(-4)}`, // Default name
        role: userRole,
        // Email is optional for phone-only users
      });
      
      user = await this.usersRepository.save(user);
      this.logger.log(`Created new user via phone auth: ${user.id}`);
    }
    
    // Generate tokens using existing logic
    const tokens = await this.generateAndStoreTokens(user);
    
    return {
      success: true,
      message: 'Phone authentication successful',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          userId: user.id,
          phone: user.phone,
          fullName: user.name,
          email: user.email || null,
          role: user.role,
        },
      },
    };
  }
}
