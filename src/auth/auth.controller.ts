import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(): CookieOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
      path: '/',
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  // Bắt đầu quá trình xác thực Google OAuth2. Khi người dùng truy cập endpoint này,
  // AuthGuard('google') sẽ chuyển hướng họ đến trang đăng nhập Google.
  // Hàm này không cần xử lý gì thêm vì quá trình xác thực sẽ được guard đảm nhận.
  async googleAuth(@Req() req: Request) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  // Xử lý callback sau khi người dùng đăng nhập bằng Google OAuth2
  // 1. Nhận thông tin người dùng từ Google thông qua AuthGuard
  // 2. Gọi authService.googleLogin để xử lý đăng nhập hoặc đăng ký tài khoản Google
  // 3. Nếu không có response (người dùng chưa đăng ký hoặc có lỗi), chuyển hướng về trang chủ frontend
  // 4. Nếu đăng nhập thành công, đặt access_token và refresh_token vào cookie (HTTP-only)
  // 5. Chuyển hướng về trang chủ frontend sau khi đăng nhập thành công
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    // Gọi service để xử lý đăng nhập Google, truyền thông tin người dùng từ request
    const response = await this.authService.googleLogin(req.user);

    // Nếu không có response (có thể do lỗi hoặc tài khoản chưa được xử lý), chuyển hướng về trang chủ frontend
    if (!response) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://example.com';
      return res.redirect(`${frontendUrl}/`);
    }

    // Lấy cấu hình cookie phù hợp với môi trường (production hoặc development)
    const cookieOptions = this.getCookieOptions();

    // Đặt access_token vào cookie với thời gian sống 1 giờ
    res.cookie('access_token', response.data.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    // Đặt refresh_token vào cookie với thời gian sống 7 ngày
    res.cookie('refresh_token', response.data.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Chuyển hướng về trang chủ frontend sau khi đăng nhập thành công
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://example.com';
    res.redirect(`${frontendUrl}/`);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const { email, code } = verifyEmailDto;
    return this.authService.verifyEmail(email, code);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    const { email } = resendDto;
    return this.authService.resendVerification(email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotDto: ForgotPasswordDto) {
    const { email } = forgotDto;
    return this.authService.forgotPassword(email);
  }

  @Post('verify-reset-token')
  @HttpCode(HttpStatus.OK)
  async verifyResetToken(@Body() verifyDto: VerifyResetTokenDto) {
    const { token } = verifyDto;
    return this.authService.verifyResetToken(token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    const { token, newPassword } = resetDto;
    return this.authService.resetPassword(token, newPassword);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@Req() req) {
    return {
      success: true,
      data: {
        fullName: req.user.fullName,
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.authService.login(loginDto);

    const cookieOptions = this.getCookieOptions();

    // Set HTTP-only cookies for both tokens
    res.cookie('access_token', response.data.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    res.cookie('refresh_token', response.data.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data without tokens
    return {
      success: true,
      data: {
        user: response.data.user,
      },
    };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      refreshTokenDto.refreshToken || req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const response = await this.authService.refreshToken(refreshToken);

    const cookieOptions = this.getCookieOptions();

    // Set new HTTP-only cookies
    res.cookie('access_token', response.data.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    res.cookie('refresh_token', response.data.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data without tokens
    return {
      success: true,
      data: {
        user: response.data.user,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieOptions = this.getCookieOptions();

    // Clear cookies with the same options as they were set (except maxAge)
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
