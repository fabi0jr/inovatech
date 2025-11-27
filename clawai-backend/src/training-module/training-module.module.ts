import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingSession } from './entities/training-session.entity';
import { TrainingImage } from './entities/training-image.entity';
import { Annotation } from './entities/annotation.entity';
import { TrainingService } from './training/training.service'; // Adicionado pelo CLI
import { TrainingController } from './training/training.controller'; // Adicionado pelo CLI

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingSession,
      TrainingImage,
      Annotation,
    ]),
  ],
  providers: [TrainingService], // Registra o service
  controllers: [TrainingController], // Registra o controller
})
export class TrainingModuleModule {}