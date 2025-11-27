import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';


export class CreateAnnotationDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;
}