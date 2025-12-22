import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('FACEBOOK_APP_ID') || '',
      clientSecret: configService.get('FACEBOOK_APP_SECRET') || '',
      callbackURL: configService.get('FACEBOOK_CALLBACK_URL') || '',
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;

    // Enhanced Facebook profile with provider mapping - follows Google pattern
    const user = {
      facebookId: id, // This becomes provider_user_id
      email: emails?.[0]?.value,
      name: `${name?.givenName || ''} ${name?.familyName || ''}`.trim() || profile.displayName,
      avatar: photos?.[0]?.value,
      provider: 'facebook' as const, // Provider identifier
    };

    done(null, user);
  }
}