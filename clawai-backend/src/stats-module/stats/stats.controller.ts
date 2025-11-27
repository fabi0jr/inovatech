import { Controller, Get, Post, Body } from '@nestjs/common';
import { StatsService } from './stats.service';
import { SystemHealthService } from './system-health.service';

@Controller('stats') // Rota /stats
export class StatsController {
  constructor(private readonly statsService: StatsService,
    private readonly healthService: SystemHealthService
  ) {}

  @Get()
  getStats() {
    return this.statsService.getDashboardStats();
  }

  @Post('heartbeat')
  receiveHeartbeat(@Body() heartbeatDto: any) {
    this.healthService.updateHeartbeat(heartbeatDto)
    return {status: 'ok'}
  }

}