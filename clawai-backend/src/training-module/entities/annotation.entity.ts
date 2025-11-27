import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { TrainingImage } from './training-image.entity';

@Entity('annotations') // Nome da tabela
export class Annotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  label: string;

  @Column('float')
  x: number;

  @Column('float')
  y: number;

  @Column('float')
  width: number;

  @Column('float')
  height: number;

  // Relação: Muitas anotações pertencem a UMA imagem
  @ManyToOne(() => TrainingImage, (image) => image.annotations)
  image: TrainingImage;
}