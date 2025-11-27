import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    Param, // 1. Importe Param
    ParseUUIDPipe, // Para validar que o ID é um UUID
    ValidationPipe, // Para validar o Body
  } from '@nestjs/common';
  import { TrainingService, CreateTrainingSessionDto } from './training.service';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { CreateAnnotationDto } from '../dto/create-annotation.dto';
  import { StartTrainingDto } from '../dto/start-training.dto';
  
  @Controller('training')
  export class TrainingController {
    constructor(private readonly trainingService: TrainingService) {}
  
    @Get('sessions/recent')
    findRecentSessions(@Query('limit') limit: string) {
      const take = limit ? parseInt(limit, 10) : 5;
      return this.trainingService.findRecentSessions(take);
    }

    @Post('sessions')
    createSession(@Body() createDto: CreateTrainingSessionDto) {
      return this.trainingService.createSession(createDto);
    }
  
    @Post('upload')
    @UseInterceptors(
      FileInterceptor('file', {
        // 'file' é o nome do campo no formulário (frontend)
        storage: diskStorage({
          destination: './uploads', // A pasta que criamos
          filename: (req, file, cb) => {
            // Garante nomes de arquivo únicos
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const originalName = file.originalname.replace(/\s/g, '_');
            cb(null, `${uniqueSuffix}-${originalName}`);
          },
        }),
      }),
    )
    uploadFile(
      @UploadedFile() file: Express.Multer.File,
      @Body() body: { sessionId: string },
    ) {
      if (!body.sessionId) {
        // (Idealmente, isso seria validado por um DTO)
        throw new Error('sessionId é obrigatório');
      }
  
      return this.trainingService.handleFileUpload(file, body.sessionId);
    }

    @Get('images/:imageId/annotations')
    getAnnotations(@Param('imageId', ParseUUIDPipe) imageId: string) {
      return this.trainingService.getAnnotationsForImage(imageId);
    }

    @Post('images/:imageId/annotations')
    saveAnnotations(
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body(new ValidationPipe()) // Valida cada item no array
    annotationsDto: CreateAnnotationDto[],
  ) {
    return this.trainingService.saveAnnotations(imageId, annotationsDto);
  }
  
  @Post('sessions/:sessionId/start')
  startTraining(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() startTrainingDto: StartTrainingDto, // O Nest valida o DTO automaticamente
  ) {
    return this.trainingService.startTraining(sessionId, startTrainingDto);
  }
}