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
import { v4 as uuidv4 } from 'uuid';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../booking/email.service';

type GoogleProfile = {
  googleId?: string;
  email?: string;
  name?: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private jwtConfigService: JwtConfigService,
    private emailService: EmailService,
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
   * Google login handler — typed profile instead of `any`
   */
  async googleLogin(profile?: GoogleProfile | null) {
    if (!profile || !profile.googleId) return null;

    let existingUser = await this.usersRepository.findOne({
      where: { googleId: profile.googleId },
    });

    if (!existingUser) {
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(Math.random().toString(), salt);

      // Determine role based on email
      const userRole = this.determineUserRole(profile.email || '');

      // create expects a Partial<User>; cast to User for TypeORM API
      existingUser = this.usersRepository.create({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        passwordHash: passwordHash,
        role: userRole,
      } as Partial<User> as User);

      await this.usersRepository.save(existingUser);
    }

    const { accessToken, refreshToken } =
      await this.generateAndStoreTokens(existingUser);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          userId: existingUser.id,
          email: existingUser.email,
          fullName: existingUser.name,
          role: existingUser.role,
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

    // Generate a 6-digit verification code and set expiry (15 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    savedUser.emailVerificationCode = code;
    savedUser.emailVerificationExpiresAt = expiresAt;
    await this.usersRepository.save(savedUser);

    // Send verification email (failure to send shouldn't block registration)
    try {
      await this.emailService.sendEmail({
        to: savedUser.email,
        subject: 'Verify your Busticket account',
        text: `Your verification code is ${code}. It expires in 15 minutes.`,
      });
      this.logger.log(`Verification email sent to ${savedUser.email}`);
    } catch (err: any) {
      this.logger.warn(`Failed to send verification email to ${savedUser.email}: ${err?.message || err}`);
    }

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
          email: user.email,
          fullName: user.name,
          role: user.role,
        },
      },
    };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid verification code or email');
    }

    if (
      !user.emailVerificationCode ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationCode !== code ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpiresAt = null;

    await this.usersRepository.save(user);

    return {
      success: true,
      message: 'Email verified successfully',
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
        // delete expired token and throw
         await this.refreshTokenRepository.remove(storedToken);
        throw new ForbiddenException('Refresh token has expired');
      }

      const user = storedToken.user;
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // remove old token immediately
       await this.refreshTokenRepository.remove(storedToken);

      // generate and store new tokens
      const tokens = await this.generateAndStoreTokens(user);

      return {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            userId: user.id,
            email: user.email,
            fullName: user.name,
            role: user.role,
          },
        },
      };
    } catch (err: unknown) {
      // narrow to check name safely
      const e = err as { name?: string } | undefined;
      if (e?.name === 'TokenExpiredError') {
        // Attempt to remove the expired token record from DB so tests
        // and callers don't observe stale entries. Use QueryBuilder to
        // ensure the deletion is committed and visible across connections.
        try {
          await this.refreshTokenRepository
            .createQueryBuilder()
            .delete()
            .where('token = :token', { token: refreshToken })
            .execute();
        } catch (deleteErr) {
          // ignore deletion errors — we still want to return the expired error
        }
        throw new ForbiddenException('Refresh token has expired');
      }
      if (e?.name === 'JsonWebTokenError') {
        throw new ForbiddenException('Invalid refresh token');
      }
      throw err;
    }
  }

  private async generateAndStoreTokens(user: User) {
    const jti = uuidv4(); // Unique identifier for this token pair

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        fullName: user.name,
        role: user.role,
        jti,
      },
      {
        secret: this.jwtConfigService.accessTokenSecret,
        expiresIn: this.jwtConfigService.getExpirationInSeconds(
          this.jwtConfigService.accessTokenExpiration,
        ),
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, jti },
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
}
