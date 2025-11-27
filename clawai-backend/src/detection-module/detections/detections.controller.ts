import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DetectionsService, CreateDetectionDto } from './detections.service';

@Controller('detections')
export class DetectionsController {
  constructor(private readonly detectionsService: DetectionsService) {}

  // Rota para o Frontend (LiveMonitor.tsx)
  // GET /detections/recent
  @Get('recent')
  findRecent(@Query('limit') limit: string) {
    const take = limit ? parseInt(limit, 10) : 10;
    return this.detectionsService.findRecent(take);
  }

  // Rota para seu Script Python de IA
  // POST /detections
  @Post()
  create(@Body() createDetectionDto: CreateDetectionDto) {
    // Aqui você adicionaria validação de dados (DTOs)
    return this.detectionsService.create(createDetectionDto);
  }
}