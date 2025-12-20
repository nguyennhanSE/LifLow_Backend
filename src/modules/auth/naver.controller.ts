import { Controller, Get, Query, Req } from '@nestjs/common';
import { Public } from 'src/libs/decorator/public.decorator';
import { ResponseModel } from 'src/libs/models/response/response.model';
import { NaverOAuthService } from './naver-oauth.service';
import { AuthService } from './auth.service';

@Controller('auth/naver')
export class NaverController {
  constructor(
    private readonly naverOAuthService: NaverOAuthService,
    private readonly authService: AuthService,
  ) {}

  /**
   * GET /api/v1/auth/naver
   * Returns Naver authorization URL for frontend redirect.
   */
  @Get()
  @Public()
  getAuthUrl() {
    const url = this.naverOAuthService.getAuthorizationUrl();
    const responseModel = new ResponseModel();
    responseModel.setData({ url });
    return responseModel;
  }

  /**
   * GET /api/v1/auth/naver/callback?code=...&state=...
   * Exchanges code, finds/creates user, returns Liflow JWT tokens.
   */
  @Get('callback')
  @Public()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: any,
  ) {
    const user = await this.naverOAuthService.handleNaverCallback(code, state);
    const ip: string | undefined = req?.ip || req?.connection?.remoteAddress;
    const result = await this.authService.oauthLogin(user.id, user.email, ip);

    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }
}
