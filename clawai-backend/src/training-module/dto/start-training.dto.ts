import {
    IsString,
    IsNumber,
    IsEnum,
    IsOptional,
    Min,
    Max,
  } from 'class-validator';
  
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
  
  export class StartTrainingDto {
    @IsEnum(ModelType)
    modelType: ModelType;
  
    @IsNumber()
    @Min(1)
    epochs: number;
  
    @IsNumber()
    learningRate: number;
  
    @IsNumber()
    @Min(1)
    batchSize: number;
  
    @IsString()
    itemName: string;
  
    @IsString()
    @IsOptional()
    description?: string;
  
    @IsEnum(ItemCategory)
    category: ItemCategory;
  
    @IsEnum(PriorityLevel)
    priority: PriorityLevel;
  
    @IsNumber()
    @Min(0)
    @Max(100)
    detectionThreshold: number;
  }