import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
  } from 'typeorm';
  import { TrainingSession } from './training-session.entity';
  import { Annotation } from './annotation.entity'; // Vamos criar este arquivo a seguir
  
  @Entity('training_images') // Nome da tabela
  export class TrainingImage {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    filename: string; // Nome original do arquivo
  
    @Column()
    storagePath: string; // Caminho no S3, MinIO ou disco local
  
    // Relação: Muitas imagens pertencem a UMA sessão
    @ManyToOne(() => TrainingSession, (session) => session.images)
    session: TrainingSession;
  
    // Relação: Uma imagem pode ter muitas anotações
    @OneToMany(() => Annotation, (annotation) => annotation.image)
    annotations: Annotation[];
  }