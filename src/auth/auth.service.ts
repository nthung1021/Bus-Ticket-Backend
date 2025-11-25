import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private jwtConfigService: JwtConfigService,
  ) {}

  async googleLogin(user: any) {
    if (!user || !user.googleId) return null;
    let existingUser = await this.usersRepository.findOne({
      where: { googleId: user.googleId },
    });
    if (!existingUser) {
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(Math.random().toString(), salt);

      existingUser = this.usersRepository.create({
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        passwordHash: passwordHash,
      });
      await this.usersRepository.save(existingUser);
    }
    // Generate tokens
    // Generate and store tokens
    const { accessToken, refreshToken } =
      await this.generateAndStoreTokens(existingUser);

    // Return response in the specified format
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
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: signUpDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(signUpDto.password, salt);

    // Create and save user
    const user = this.usersRepository.create({
      email: signUpDto.email,
      passwordHash: hashedPassword,
      name: signUpDto.fullName,
      phone: signUpDto.phone,
      role: UserRole.CUSTOMER,
    });

    const savedUser = await this.usersRepository.save(user);

    // Return user data in the specified format
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

    // Find user by email
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    // Generate tokens
    // Generate and store tokens
    const { accessToken, refreshToken } =
      await this.generateAndStoreTokens(user);

    // Return response in the specified format
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

  async refreshToken(refreshToken: string) {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtConfigService.refreshTokenSecret,
      });

      // Check if token exists in DB
      const storedToken = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken },
        relations: ['user'],
      });

      if (!storedToken) {
        throw new ForbiddenException('Invalid refresh token');
      }

      // Check if expired
      if (storedToken.expiresAt < new Date()) {
        await this.refreshTokenRepository.delete(storedToken.id);
        throw new ForbiddenException('Refresh token has expired');
      }

      const user = storedToken.user;
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateAndStoreTokens(user);

      // Delete old refresh token (Rotation)
      await this.refreshTokenRepository.delete(storedToken.id);

      // Return the new tokens in the same format as login
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
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ForbiddenException('Refresh token has expired');
      }
      throw error;
    }
  }

  private async generateAndStoreTokens(user: User) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
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
    });
    await this.refreshTokenRepository.save(tokenEntity);

    return { accessToken, refreshToken };
  }
}
