import { Controller, Get, Query, Req } from '@nestjs/common';
import { Public } from 'src/libs/decorator/public.decorator';
import { ResponseModel } from 'src/libs/models/response/response.model';
import { KakaoOAuthService } from './kakao-oauth.service';
import { AuthService } from './auth.service';

@Controller('auth/kakao')
export class KakaoController {
  constructor(
    private readonly kakaoOAuthService: KakaoOAuthService,
    private readonly authService: AuthService,
  ) {}

  /**
   * GET /api/v1/auth/kakao
   * Returns Kakao authorization URL for frontend redirect.
   */
  @Get()
  @Public()
  getAuthUrl() {
    const url = this.kakaoOAuthService.getAuthorizationUrl();
    const responseModel = new ResponseModel();
    responseModel.setData({ url });
    return responseModel;
  }

  /**
   * GET /api/v1/auth/kakao/callback?code=...
   * Exchanges code, finds/creates user, returns Liflow JWT tokens.
   */
  @Get('callback')
  @Public()
  async callback(@Query('code') code: string, @Req() req: any) {
    const user = await this.kakaoOAuthService.handleKakaoCallback(code);
    const ip = req?.ip || req?.connection?.remoteAddress;
    const result = await this.authService.oauthLogin(user.id, user.email, ip);

    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }
}


