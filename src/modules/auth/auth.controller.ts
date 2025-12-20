import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, RefreshTokenRequestDto } from './dto/auth.dto';
import { Public } from 'src/libs/decorator/public.decorator';
import { ResponseModel } from 'src/libs/models/response/response.model';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.authService.login(loginDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
  @Post('logout')
  @Public()
  async logout(@Body() logoutDto: LogoutDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.authService.logout(logoutDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
  @Post('refresh-token')
  @Public()
  async refreshToken(@Body() refreshTokenDto: RefreshTokenRequestDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.authService.refreshToken(refreshTokenDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
}
