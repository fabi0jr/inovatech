import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Detection, DetectionCategory } from '../entities/detection.entity';

export class CreateDetectionDto {
  type: string;
  category: DetectionCategory;
  confidence: number;
  status: string;
}

@Injectable()
export class DetectionsService {
  constructor(
    @InjectRepository(Detection)
    private detectionsRepository: Repository<Detection>,
  ) {}

  // Método para o frontend buscar as detecções recentes
  async findRecent(limit = 10): Promise<Detection[]> {
    return this.detectionsRepository.find({
      order: {
        timestamp: 'DESC', // Ordena pelas mais recentes
      },
      take: limit, // Pega apenas as últimas 'limit' detecções
    });
  }

  // Método para seu script Python de Visão Computacional enviar dados
  async create(createDetectionDto: CreateDetectionDto): Promise<Detection> {
    const newDetection = this.detectionsRepository.create(createDetectionDto);
    return this.detectionsRepository.save(newDetection);
  }

  // (No futuro, adicionaremos aqui o StatsService)
}