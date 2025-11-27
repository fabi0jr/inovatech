export interface Detection {
    id: string;
    timestamp: string;
    type: string;
    category: 'A' | 'B' | 'C'| 'D';
    confidence: number;
    status?: string;
  }
  
// Novo tipo para nossos Stats
export interface DashboardStats {
  itemSeparation: {
    categoryA: number;
    categoryB: number;
    categoryC: number;
    categoryD: number;
    unclassified: number;
  };
  performance: {
    classificationRate: number;
    processingSpeed: number;
  };
  systemStatus: {
    aiModel: string;
    cameraFeed: string;
    dataStorage: number;
  };
}

export interface TrainingSession {
  id: string;
  name: string;
  status: 'processing' | 'complete' | 'failed';
  createdAt: string;
  updatedAt: string;
  images?: TrainingImage[];

  }


  export interface Annotation {
      id: string;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
  }

  export interface TrainingImage {
  id: string;
  filename: string;
  storagePath: string;
  session: TrainingSession;
  }

  export enum ModelType {
    OBJECT_DETECTION = 'object-detection',
    CLASSIFICATION = 'classification',
    SEGMENTATION = 'segmentation',
  }
  
  export enum ItemCategory {
    SAFETY = 'safety',
    PARTS = 'parts',
    DEFECTS = 'defects',
  }
  
  export enum PriorityLevel {
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
  }
  
  // Este é o DTO que enviaremos para o backend
  export interface StartTrainingDto {
    modelType: ModelType;
    epochs: number;
    learningRate: number;
    batchSize: number;
    itemName: string;
    description?: string;
    category: ItemCategory;
    priority: PriorityLevel;
    detectionThreshold: number;
  }