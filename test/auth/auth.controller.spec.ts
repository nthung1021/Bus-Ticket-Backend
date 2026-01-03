import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { SignUpDto } from '../../src/auth/dto/signup.dto';
import { LoginDto } from '../../src/auth/dto/login.dto';
import { RefreshTokenDto } from '../../src/auth/dto/refresh-token.dto';

describe('AuthController', () => {
  let controller: AuthController;

  // typed mock shapes for clarity
  const googleResponse = {
    data: {
      accessToken: 'g-access',
      refreshToken: 'g-refresh',
    },
  };

  const svcLoginResponse = {
    data: {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'u1', email: 'a@x.com', name: 'A' },
    },
  };

  const mockAuthService: Partial<AuthService> = {
    googleLogin: jest.fn(),
    signUp: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'development';
      if (key === 'FRONTEND_URL') return 'http://localhost:8000';
      return null;
    }),
  };

  beforeEach(async () => {
    process.env.FRONTEND_URL = 'http://localhost:8000'; // Set env var for redirect tests
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService }, // Provide Mock ConfigService
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('googleAuthRedirect', () => {
    it('redirects to fallback when service returns null', async () => {
      (mockAuthService.googleLogin as jest.Mock).mockResolvedValueOnce(null);

      const fakeReq = { user: { id: 'u1' } } as unknown as Request;
      const res: Partial<Response> = {
        redirect: jest.fn(),
      };

      await controller.googleAuthRedirect(fakeReq, res as Response);

      expect(mockAuthService.googleLogin).toHaveBeenCalledWith(
        (fakeReq as any).user,
      );
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:8000/');
    });

    it('sets cookies and redirects on success', async () => {
      (mockAuthService.googleLogin as jest.Mock).mockResolvedValueOnce(
        googleResponse,
      );

      const fakeReq = { user: { id: 'u1' } } as unknown as Request;
      const res: Partial<Response> = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      };

      await controller.googleAuthRedirect(fakeReq, res as Response);

      expect(mockAuthService.googleLogin).toHaveBeenCalledWith(
        (fakeReq as any).user,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'g-access',
        expect.any(Object),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'g-refresh',
        expect.any(Object),
      );
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:8000/');
    });
  });

  describe('signUp', () => {
    it('delegates to authService.signUp', async () => {
      const dto: SignUpDto = {
        email: 'a@b.com',
        password: 'p',
        fullName: 'A',
        phone: '0912345678',
      } as SignUpDto;
      (mockAuthService.signUp as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { id: 'u1' },
      });

      const out = await controller.signUp(dto);
      expect(mockAuthService.signUp).toHaveBeenCalledWith(dto);
      expect(out).toEqual({ success: true, data: { id: 'u1' } });
    });
  });

  describe('getCurrentUser', () => {
    it('returns sanitized user from req.user', async () => {
      const req = {
        user: {
          fullName: 'Alice',
          userId: 'u-1',
          email: 'a@x.com',
          role: 'ADMIN',
        },
      } as unknown as Request;

      const out = await controller.getCurrentUser(req);
      expect(out).toEqual({
        success: true,
        data: {
          fullName: 'Alice',
          userId: 'u-1',
          email: 'a@x.com',
          role: 'ADMIN',
        },
      });
    });
  });

  describe('login', () => {
    it('sets cookies and returns user data', async () => {
      const dto: LoginDto = { email: 'a@x.com', password: 'pass' } as LoginDto;
      (mockAuthService.login as jest.Mock).mockResolvedValueOnce(
        svcLoginResponse,
      );

      const res: Partial<Response> = {
        cookie: jest.fn(),
      };

      const out = await controller.login(dto, res as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-1',
        expect.any(Object),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-1',
        expect.any(Object),
      );
      expect(out).toEqual({
        success: true,
        data: { user: svcLoginResponse.data.user },
      });
    });
  });

  describe('refreshToken', () => {
    it('throws when no refresh token present', async () => {
      const req = { cookies: {} } as Request;
      await expect(
        controller.refreshToken(req, {} as RefreshTokenDto, {} as Response),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('uses cookie refresh token and sets cookies', async () => {
      (mockAuthService.refreshToken as jest.Mock).mockResolvedValueOnce({
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          user: { id: 'u1', email: 'a@x.com' },
        },
      });

      const req = {
        cookies: { refresh_token: 'old-refresh' },
      } as unknown as Request;
      const res: Partial<Response> = { cookie: jest.fn() };

      const out = await controller.refreshToken(
        req,
        {} as RefreshTokenDto,
        res as Response,
      );

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-refresh');
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'new-access',
        expect.any(Object),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh',
        expect.any(Object),
      );
      expect(out).toEqual({
        success: true,
        data: { user: { id: 'u1', email: 'a@x.com' } },
      });
    });
  });

  describe('logout', () => {
    it('clears cookies and returns success message', async () => {
      const res: Partial<Response> = { clearCookie: jest.fn() };

      const out = await controller.logout(res as Response);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(out).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });
});
