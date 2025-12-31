import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtConfigService } from '../config/jwt.config.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private jwtConfigService: JwtConfigService,
    private emailService: EmailService,
    private configService: ConfigService,
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

  async resendVerification(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    // Generate a new 6-digit verification code and expiry (15 minutes)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    user.emailVerificationCode = code;
    user.emailVerificationExpiresAt = expiresAt;
    await this.usersRepository.save(user);

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Your Busticket verification code',
        text: `Your verification code is ${code}. It expires in 15 minutes.`,
      });
      this.logger.log(`Resent verification email to ${user.email}`);
    } catch (err: any) {
      this.logger.warn(`Failed to resend verification email to ${user.email}: ${err?.message || err}`);
      throw new BadRequestException('Failed to send verification email');
    }

    return {
      success: true,
      message: 'Verification email resent',
    };
  }

  async forgotPassword(email: string) {
    // Validate input early
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      throw new BadRequestException('Invalid email address');
    }

    // Generate a secure token and its hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const salt = await bcrypt.genSalt();
    const tokenHash = await bcrypt.hash(rawToken, salt);

    // Expire in 1 hour
    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 1);

    try {
      // Try to find user; do not reveal whether it exists to callers
      const user = await this.usersRepository.findOne({ where: { email } });

      if (!user) {
        // No user found — return generic success to avoid leaking account existence
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://example.com';
        const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
        return {
          success: true,
          data: { resetUrl },
          message: "If an account with that email exists, we've sent password reset instructions.",
        };
      }

      // Invalidate previous unused tokens for this user (best effort)
      try {
        await this.passwordResetTokenRepository
          .createQueryBuilder()
          .delete()
          .where('user_id = :userId AND used = false', { userId: user.id })
          .execute();
      } catch (cleanupErr) {
        this.logger.warn(`Failed to cleanup previous reset tokens for user ${user.id}: ${cleanupErr}`);
      }

      // Save new token
      const tokenEntity = this.passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiredAt,
        used: false,
      } as Partial<PasswordResetToken> as PasswordResetToken);

      try {
        await this.passwordResetTokenRepository.save(tokenEntity);
      } catch (saveErr) {
        this.logger.error(`Failed to save password reset token for user ${user.id}: ${saveErr}`);
        throw new InternalServerErrorException('Failed to generate reset token');
      }

      // Send reset email (best effort — email failures shouldn't crash the flow)
      try {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://example.com';
        await this.emailService.sendEmail({
          to: user.email,
          subject: 'Password reset instructions',
          text: `Use the following link to reset your password: ${frontendUrl}/reset-password?token=${rawToken}`,
        });
        this.logger.log(`Password reset email sent to ${user.email}`);
      } catch (err: any) {
        // Log and continue — we'll still return the reset link to the caller
        this.logger.warn(`Failed to send password reset email to ${user.email}: ${err?.message || err}`);
      }

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://example.com';
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      return {
        success: true,
        data: { resetUrl },
        message: "If an account with that email exists, we've sent password reset instructions.",
      };
    } catch (err: any) {
      // Log and normalize unexpected errors
      this.logger.error(`forgotPassword failed for email=${email}: ${err?.message || err}`);
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException('Failed to process request');
    }
  }

  async verifyResetToken(token: string) {
    const now = new Date();

    // Find candidate tokens that are unused (and optionally recent)
    const candidates = await this.passwordResetTokenRepository.find({
      where: { used: false },
      order: { createdAt: 'DESC' },
    });

    for (const c of candidates) {
      // Skip expired
      if (c.expiredAt < now) continue;

      // Compare using bcrypt (tokenHash is salted)
      const match = await bcrypt.compare(token, c.tokenHash);
      if (match) {
        // Valid token; return minimal identifying info (userId)
        return {
          success: true,
          data: {
            userId: c.userId,
          },
        };
      }
    }

    throw new BadRequestException('Invalid or expired token');
  }

  async resetPassword(token: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const now = new Date();

    return await this.usersRepository.manager.transaction(async (manager) => {
      const tokenRepo = manager.getRepository(PasswordResetToken);
      const userRepo = manager.getRepository(User);

      // Fetch candidates (unused tokens)
      const candidates = await tokenRepo.find({
        where: { used: false },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });

      let found: PasswordResetToken | null = null;
      for (const c of candidates) {
        if (c.expiredAt < now) continue;
        if (await bcrypt.compare(token, c.tokenHash)) {
          found = c;
          break;
        }
      }

      if (!found) {
        throw new BadRequestException('Invalid or expired token');
      }

      const user = found.user;
      if (!user) {
        throw new BadRequestException('Associated user not found');
      }

      // Hash new password
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(newPassword, salt);

      await userRepo.update({ id: user.id }, { passwordHash });

      // Mark all tokens for this user as used to prevent reuse
      await tokenRepo
        .createQueryBuilder()
        .update()
        .set({ used: true })
        .where('user_id = :userId', { userId: user.id })
        .execute();

      return {
        success: true,
        message: 'Password updated successfully',
      };
    });
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
