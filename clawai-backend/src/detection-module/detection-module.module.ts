import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Detection } from './entities/detection.entity';
import { DetectionsService } from './detections/detections.service';
import { DetectionsController } from './detections/detections.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Detection]),
  ],
  controllers: [DetectionsController],
  providers: [DetectionsService],
})
export class DetectionModuleModule {}