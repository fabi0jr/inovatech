import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Detection } from '../../detection-module/entities/detection.entity';
import { SystemHealthService } from './system-health.service';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Detection)
    private detectionsRepository: Repository<Detection>,
    private readonly healthService: SystemHealthService
  ) {}

  async getDashboardStats() {
    // 1. Calcular Item Separation (Dados Reais)
    const counts = await this.detectionsRepository
      .createQueryBuilder('detection')
      .select('detection.category', 'category')
      .addSelect('COUNT(detection.id)', 'count')
      .groupBy('detection.category')
      .getRawMany();

    // Formata os dados no formato que o frontend espera
    const itemSeparation = {
      categoryA: 0,
      categoryB: 0,
      categoryC: 0,
      unclassified: 0,
    };
    let totalDetections = 0;
    let classifiedDetections = 0;

    counts.forEach((row) => {
      const count = parseInt(row.count, 10);
      totalDetections += count;
      if (row.category === 'A') {
        itemSeparation.categoryA = count;
        classifiedDetections += count;
      } else if (row.category === 'B') {
        itemSeparation.categoryB = count;
        classifiedDetections += count;
      } else if (row.category === 'C') {
        itemSeparation.categoryC = count;
        classifiedDetections += count;
      } else {
        itemSeparation.unclassified = count;
      }
    });

    // 3. Pega os dados de status e performance do nosso serviço de cache
    const healthData = this.healthService.getSystemStatus();

    // 4. Calcula a "Taxa de Classificação" real
    const classificationRate =
      totalDetections === 0
        ? 0
        : (classifiedDetections / totalDetections) * 100;

    // 5. Combina tudo e retorna
    return {
      itemSeparation,
      performance: {
        ...healthData.performance,
        classificationRate: parseFloat(classificationRate.toFixed(1)),
      },
      systemStatus: healthData.systemStatus,
      cameraDetails: healthData.cameraDetails,
    };
  }
}