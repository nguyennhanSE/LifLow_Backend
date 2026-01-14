import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'prisma/prisma.service';
import { config } from 'src/libs/config';
import { ERoleName } from '../roles/enums/role.enum';

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  refresh_token_expires_in?: number;
}

interface KakaoUserInfo {
  id: number;
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
  };
}

@Injectable()
export class KakaoOAuthService {
  private readonly logger = new Logger(KakaoOAuthService.name);
  private readonly KAKAO_AUTH_URL = 'https://kauth.kakao.com';
  private readonly KAKAO_API_URL = 'https://kapi.kakao.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  getAuthorizationUrl(): string {
    const clientId = config.KAKAO_REST_API_KEY;
    const redirectUri = config.KAKAO_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException(
        'Kakao OAuth configuration is missing. Please set KAKAO_REST_API_KEY and KAKAO_REDIRECT_URI.',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'profile_nickname,profile_image,account_email',
    });

    return `${this.KAKAO_AUTH_URL}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, ip?: string): Promise<KakaoTokenResponse> {
    const clientId = config.KAKAO_REST_API_KEY;
    const redirectUri = config.KAKAO_REDIRECT_URI;
    const clientSecret = config.KAKAO_CLIENT_SECRET;

    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException(
        'Kakao OAuth configuration is missing. Please set KAKAO_REST_API_KEY and KAKAO_REDIRECT_URI.',
      );
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    });
    // client_secret is optional for Kakao depending on app settings
    if (clientSecret) params.set('client_secret', clientSecret);

    try {
      const response = await firstValueFrom(
        this.httpService.post<KakaoTokenResponse>(
          `${this.KAKAO_AUTH_URL}/oauth/token`,
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error('Kakao token exchange failed', err?.response?.data || err);
      throw new BadRequestException('Failed to authenticate with Kakao');
    }
  }

  async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<KakaoUserInfo>(`${this.KAKAO_API_URL}/v2/user/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        }),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error('Kakao get user info failed', err?.response?.data || err);
      throw new BadRequestException('Failed to retrieve Kakao user information');
    }
  }

  /**
   * Returns (or creates) a Liflow user based on Kakao email.
   */
  async handleKakaoCallback(code: string): Promise<{ id: string; email: string; name: string }> {
    if (!code) throw new BadRequestException('Authorization code is required');

    const token = await this.exchangeCodeForToken(code);
    const kakaoUser = await this.getUserInfo(token.access_token);

    const email = kakaoUser.kakao_account?.email;
    if (!email) {
      throw new BadRequestException('Kakao account email is required');
    }

    const name =
      kakaoUser.kakao_account?.profile?.nickname ||
      kakaoUser.properties?.nickname ||
      'Kakao User';

    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      return { id: existing.id, email: existing.email || '', name: existing.name || '' };
    }

    // Create USER role mapping (if not exists, fail fast)
    const role = await this.prisma.role.findUnique({ where: { name: ERoleName.USER } });
    if (!role) {
      throw new InternalServerErrorException('USER role is missing in database');
    }

    // Ensure unique user id (id is required and has no default in schema)
    const baseId = email.split('@')[0] || `kakao_${kakaoUser.id}`;
    let finalId = baseId;
    const clash = await this.prisma.user.findUnique({ where: { id: finalId } });
    if (clash) {
      finalId = `${baseId}_${Math.random().toString(36).slice(2, 8)}`;
    }

    const registrationDate = new Date().toISOString().split('T')[0];

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: finalId,
          email,
          name,
          phoneNumber: '',
          registrationDate,
          // password is null for OAuth users
          password: null,
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: role.id },
      });

      return user;
    });

    return { id: created.id, email: created.email || '', name: created.name || '' };
  }
}


