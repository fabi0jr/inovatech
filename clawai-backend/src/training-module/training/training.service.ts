import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { TrainingSession } from '../entities/training-session.entity';
import { TrainingImage } from '../entities/training-image.entity';
import { Annotation } from '../entities/annotation.entity';
import { CreateAnnotationDto } from '../dto/create-annotation.dto'; 
import { StartTrainingDto } from '../dto/start-training.dto';
import { TrainingStatus } from '../entities/training-session.entity';


export class CreateTrainingSessionDto {
  name: string;
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);
  constructor(
    private readonly entityManager: EntityManager,

    @InjectRepository(TrainingSession)
    private sessionRepository: Repository<TrainingSession>,
    @InjectRepository(TrainingImage)
    private imageRepository: Repository<TrainingImage>,
    @InjectRepository(Annotation)
    private annotationRepository: Repository<Annotation>,
  ) {}

  // Método para o frontend buscar as sessões recentes (para a sidebar)
  async findRecentSessions(limit = 5): Promise<TrainingSession[]> {
    return this.sessionRepository.find({
      relations: {
        images: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  // Método para criar uma nova sessão de treinamento
  async createSession(
    createDto: CreateTrainingSessionDto,
  ): Promise<TrainingSession> {
    const newSession = this.sessionRepository.create({
      name: createDto.name,
    });
    return this.sessionRepository.save(newSession);
  }

  async handleFileUpload(
    file: Express.Multer.File,
    sessionId: string,
  ): Promise<TrainingImage> {
    // 1. Encontra a sessão de treinamento
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) {
      throw new NotFoundException(
        `Sessão de treinamento com ID ${sessionId} não encontrada`,
      );
    }

    // 2. Cria a nova entidade de imagem
    const newImage = this.imageRepository.create({
      filename: file.originalname,
      storagePath: file.path, // O Multer nos dá o caminho onde o arquivo foi salvo
      session: session, // Associa a imagem à sessão
    });

    // 3. Salva a imagem no banco de dados
    return this.imageRepository.save(newImage);
  }

  async getAnnotationsForImage(imageId: string): Promise<Annotation[]> {
    const image = await this.imageRepository.findOneBy({ id: imageId });
    if (!image) {
      throw new NotFoundException(`Imagem com ID ${imageId} não encontrada`);
    }

    return this.annotationRepository.find({
      where: { image: { id: imageId } },
    });
  }

  async saveAnnotations(
    imageId: string,
    annotationsDto: CreateAnnotationDto[],
  ): Promise<Annotation[]> {
    // Roda tudo dentro de uma transação
    return this.entityManager.transaction(async (manager) => {
      // 1. Encontra a imagem
      const image = await manager.findOneBy(TrainingImage, { id: imageId });
      if (!image) {
        throw new NotFoundException(`Imagem com ID ${imageId} não encontrada`);
      }

      // 2. Apaga todas as anotações antigas desta imagem
      await manager.delete(Annotation, { image: { id: imageId } });

      // 3. Cria as novas anotações
      const newAnnotations = annotationsDto.map((dto) => {
        return manager.create(Annotation, {
          ...dto,
          image: image, // Associa à imagem
        });
      });

      // 4. Salva o novo array de anotações
      return manager.save(Annotation, newAnnotations);
    });
  }

  async startTraining(
    sessionId: string,
    dto: StartTrainingDto,
  ): Promise<TrainingSession> {
    const session = await this.sessionRepository.findOneBy({ id: sessionId });
    if (!session) {
      throw new NotFoundException(
        `Sessão de treinamento com ID ${sessionId} não encontrada`,
      );
    }

    // 1. Atualiza a sessão imediatamente para "processing"
    session.name = dto.itemName || session.name;
    session.status = TrainingStatus.PROCESSING; // Muda para 'processing'
    await this.sessionRepository.save(session);

    this.logger.log(`Iniciando simulação de treinamento para a sessão: ${sessionId}`);
    this.logger.log(`Parâmetros recebidos: ${JSON.stringify(dto)}`); // Mantém o log original

    // 2. Dispara a simulação EM SEGUNDO PLANO (sem 'await'!)
    // Usamos .catch() para garantir que qualquer erro na simulação seja logado
    // e não trave o servidor principal.
    this._simulateTrainingProcess(session, dto).catch((err) => {
      this.logger.error(`[SIMULAÇÃO] Erro fatal no processo de simulação: ${err.message}`, err.stack);
      // Se a simulação falhar, marca a sessão como FAILED
      session.status = TrainingStatus.FAILED;
      this.sessionRepository.save(session); // (sem await, "fire-and-forget")
    });

    // 3. Retorna a sessão com status 'processing' IMEDIATAMENTE
    return session;
    }

  private async _simulateTrainingProcess(
    session: TrainingSession,
    dto: StartTrainingDto,
  ) {
    this.logger.log(`[SIMULAÇÃO] Iniciando preparação de dados para sessão: ${session.id}`);
    
    // 1. Simula a preparação dos dados (ex: 10 segundos)
    await delay(10000); 

    this.logger.log(`[SIMULAÇÃO] Preparação concluída. Iniciando treinamento do modelo.`);
    this.logger.log(`[SIMULAÇÃO] Parâmetros: ${dto.epochs} épocas, LR ${dto.learningRate}`);

    // 2. Simula o treinamento real (ex: 30 segundos)
    await delay(30000);

    this.logger.log(`[SIMULAÇÃO] Treinamento concluído para sessão: ${session.id}`);

    // 3. Atualiza a sessão para 'COMPLETE' no banco
    try {
      // Busca a sessão novamente para garantir que estamos com a instância mais recente
      const finalSession = await this.sessionRepository.findOneBy({ id: session.id });
      if (finalSession) {
        finalSession.status = TrainingStatus.COMPLETE;
        await this.sessionRepository.save(finalSession);
        this.logger.log(`[SIMULAÇÃO] Sessão ${session.id} marcada como COMPLETE.`);
      }
    } catch (err) {
      this.logger.error(`[SIMULAÇÃO] Falha ao salvar sessão ${session.id} como COMPLETE`, err);
    }
  }
}