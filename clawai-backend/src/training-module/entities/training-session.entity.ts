import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { TrainingImage } from './training-image.entity'; // Vamos criar este arquivo a seguir
  
  export enum TrainingStatus {
    PROCESSING = 'processing',
    COMPLETE = 'complete',
    FAILED = 'failed',
  }
  
  @Entity('training_sessions') // Nome da tabela
  export class TrainingSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    name: string;
  
    @Column({
      type: 'enum',
      enum: TrainingStatus,
      default: TrainingStatus.PROCESSING,
    })
    status: TrainingStatus;
  
    // Relação: Uma sessão de treinamento pode ter muitas imagens
    @OneToMany(() => TrainingImage, (image) => image.session)
    images: TrainingImage[];
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }