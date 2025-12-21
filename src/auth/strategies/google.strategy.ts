import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'), // ví dụ: https://api.yourdomain.com/auth/google/callback
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;

    // Enhanced Google profile with provider mapping
    const user = {
      googleId: id, // This becomes provider_user_id
      email: emails?.[0]?.value,
      name: displayName,
      avatar: photos?.[0]?.value,
      provider: 'google' as const, // Provider identifier
    };

    done(null, user);
  }
}
