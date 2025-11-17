// fabi0jr/clawai-backend/clawai-backend-7640140677359e0bdd3287a41ddcd0bf3e78f2a8/src/stats-module/stats/system-health.service.ts
import { Injectable } from '@nestjs/common';

// Interfaces para os dados que esperamos receber dos serviços Python
export interface CameraStatus {
  service: 'camera';
  status: 'online' | 'offline';
  cameraName: string;
  resolution: string;
  fps: number;
}

export interface AiStatus {
  service: 'ai';
  status: 'online' | 'offline';
  modelName: string;
  processingTimeMs: number; // Velocidade de Processamento
}

export type HeartbeatDto = CameraStatus | AiStatus;

// Onde vamos guardar o status em memória
interface SystemState {
  camera: Omit<CameraStatus, 'service'> & { lastSeen: Date };
  ai: Omit<AiStatus, 'service'> & { lastSeen: Date };
}

@Injectable()
export class SystemHealthService {
  // Nosso "cache" em memória simples
  private state: SystemState = {
    camera: {
      status: 'offline',
      lastSeen: new Date(0), // Data muito antiga
      cameraName: 'N/A',
      resolution: 'N/A',
      fps: 0,
    },
    ai: {
      status: 'offline',
      lastSeen: new Date(0),
      modelName: 'N/A',
      processingTimeMs: 0,
    },
  };

  /**
   * Chamado pelo endpoint POST /stats/heartbeat
   * para atualizar o status de um microsserviço.
   */
  updateHeartbeat(dto: HeartbeatDto) {
    const now = new Date();
    if (dto.service === 'camera') {
      this.state.camera = { ...dto, lastSeen: now };
    } else if (dto.service === 'ai') {
      this.state.ai = { ...dto, lastSeen: now };
    }
  }

  /**
   * Chamado pelo StatsService (GET /stats)
   * para obter o status atual agregado.
   */
  getSystemStatus() {
    const now = new Date().getTime();

    // Verifica se o último pulso foi há menos de 30 segundos
    const isCameraOnline =
      now - this.state.camera.lastSeen.getTime() < 30000;
    const isAiOnline = now - this.state.ai.lastSeen.getTime() < 30000;

    return {
      // Dados de Performance
      performance: {
        // Vamos manter a taxa de classificação vindo do DB (no StatsService)
        classificationRate: 0, // O StatsService real irá preencher isso
        // A velocidade vem direto do pulso de vida da IA
        processingSpeed: isAiOnline ? this.state.ai.processingTimeMs : 0,
      },
      // Dados de Status do Sistema
      systemStatus: {
        aiModel: isAiOnline
          ? `Online (${this.state.ai.modelName})`
          : 'Offline',
        cameraFeed: isCameraOnline
          ? `Active (${this.state.camera.cameraName})`
          : 'Offline',
        dataStorage: 78, // Vamos manter este mocado por enquanto
      },
      // Dados extras para o feed da câmera
      cameraDetails: isCameraOnline
        ? `${this.state.camera.cameraName} | ${this.state.camera.resolution} @ ${this.state.camera.fps}fps`
        : 'Camera Offline',
    };
  }
}