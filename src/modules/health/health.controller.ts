import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'libs/decorator/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Returns 200 when the application process is running.',
  })
  liveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Returns 200 when database and Redis are reachable.',
  })
  async readiness() {
    const result = await this.healthService.getReadiness();

    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
