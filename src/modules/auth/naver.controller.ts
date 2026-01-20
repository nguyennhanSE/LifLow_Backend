import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Public } from 'src/libs/decorator/public.decorator';
import { ResponseModel } from 'src/libs/models/response/response.model';
import { NaverOAuthService } from './naver-oauth.service';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { config } from 'src/libs/config';

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
   * Exchanges code, finds/creates user, redirects to frontend with tokens.
   */
  @Get('callback')
  @Public()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const frontendUrl = config.FRONTEND_URL || 'http://localhost:3000';
    
    try {
      const user = await this.naverOAuthService.handleNaverCallback(code, state);
      const ip: string | undefined = req?.ip || req?.connection?.remoteAddress;
      const result = await this.authService.oauthLogin(user.id, user.email, ip);

      // Encode result as base64 JSON string for URL safety
      const resultJson = JSON.stringify(result);
      const encodedResult = Buffer.from(resultJson).toString('base64');
      
      // Redirect to frontend with result
      const redirectUrl = `${frontendUrl}/sign-in?result=${encodeURIComponent(encodedResult)}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      // On error, redirect with error message
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      const redirectUrl = `${frontendUrl}/sign-in?error=${encodeURIComponent(errorMessage)}`;
      return res.redirect(redirectUrl);
    }
  }
}
