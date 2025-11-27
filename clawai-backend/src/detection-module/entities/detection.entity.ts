import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
  } from 'typeorm';
  
  export enum DetectionCategory {
    A = 'A',
    B = 'B',
    C = 'C',
    UNCLASSIFIED = 'UNCLASSIFIED',
  }
  
  @Entity('detections') // Nome da tabela no banco de dados
  export class Detection {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    // Usa @CreateDateColumn para salvar automaticamente a data/hora
    @CreateDateColumn({ type: 'timestamptz' })
    timestamp: Date;
  
    @Column()
    type: string; // Ex: "Metal Component"
  
    @Column({
      type: 'enum',
      enum: DetectionCategory,
      default: DetectionCategory.UNCLASSIFIED,
    })
    category: DetectionCategory;
  
    @Column('float')
    confidence: number;
  
    @Column()
    status: string; // Ex: "Category A"
  }