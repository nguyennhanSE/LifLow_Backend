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

interface NaverTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface NaverUserInfo {
  resultcode: string;
  message: string;
  response: {
    id: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
    age?: string;
    gender?: string;
    birthday?: string;
    birthyear?: string;
    mobile?: string;
  };
}

@Injectable()
export class NaverOAuthService {
  private readonly logger = new Logger(NaverOAuthService.name);
  private readonly NAVER_AUTH_URL = 'https://nid.naver.com';
  private readonly NAVER_API_URL = 'https://openapi.naver.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  getAuthorizationUrl(): string {
    const clientId = config.NAVER_CLIENT_ID;
    const redirectUri = config.NAVER_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException(
        'Naver OAuth configuration is missing. Please set NAVER_CLIENT_ID and NAVER_REDIRECT_URI.',
      );
    }

    const state = Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    return `${this.NAVER_AUTH_URL}/oauth2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, state?: string): Promise<NaverTokenResponse> {
    const clientId = config.NAVER_CLIENT_ID;
    const clientSecret = config.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Naver OAuth configuration is missing. Please set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET.',
      );
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
    });

    if (state) {
      params.set('state', state);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<NaverTokenResponse>(
          `${this.NAVER_AUTH_URL}/oauth2.0/token?${params.toString()}`,
        ),
      );

      if (response.data.error) {
        this.logger.error('Naver token exchange error', response.data);
        throw new BadRequestException(
          response.data.error_description || 'Failed to authenticate with Naver',
        );
      }

      return response.data;
    } catch (err: any) {
      this.logger.error('Naver token exchange failed', err?.response?.data || err);
      throw new BadRequestException('Failed to authenticate with Naver');
    }
  }

  async getUserInfo(accessToken: string): Promise<NaverUserInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NaverUserInfo>(`${this.NAVER_API_URL}/v1/nid/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      if (response.data.resultcode !== '00') {
        this.logger.error('Naver get user info error', response.data);
        throw new BadRequestException('Failed to retrieve Naver user information');
      }

      return response.data;
    } catch (err: any) {
      this.logger.error('Naver get user info failed', err?.response?.data || err);
      throw new BadRequestException('Failed to retrieve Naver user information');
    }
  }

  /**
   * Returns (or creates) a Liflow user based on Naver email.
   */
  async handleNaverCallback(
    code: string,
    state?: string,
  ): Promise<{ id: string; email: string; name: string }> {
    if (!code) throw new BadRequestException('Authorization code is required');

    const token = await this.exchangeCodeForToken(code, state);
    const naverUser = await this.getUserInfo(token.access_token);

    const email = naverUser.response?.email;
    if (!email) {
      throw new BadRequestException('Naver account email is required');
    }

    const name =
      naverUser.response?.name ||
      naverUser.response?.nickname ||
      'Naver User';

    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing) {
      return { id: existing.id, email: existing.email, name: existing.name };
    }

    // Create USER role mapping (if not exists, fail fast)
    const role = await this.prisma.role.findUnique({ where: { name: ERoleName.USER } });
    if (!role) {
      throw new InternalServerErrorException('USER role is missing in database');
    }

    // Ensure unique user id (id is required and has no default in schema)
    const baseId = email.split('@')[0] || `naver_${naverUser.response.id}`;
    let finalId = baseId;
    const clash = await this.prisma.user.findUnique({ where: { id: finalId } });
    if (clash) {
      finalId = `${baseId}_${Math.random().toString(36).slice(2, 8)}`;
    }

    const registrationDate = new Date().toISOString().split('T')[0];
    const phoneNumber = naverUser.response?.mobile || '';

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: finalId,
          email,
          name,
          phoneNumber,
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

    return { id: created.id, email: created.email, name: created.name };
  }
}

