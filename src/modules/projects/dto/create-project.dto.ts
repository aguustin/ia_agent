import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProjectType } from '../entities/project.entity';

export class CreateProjectDto {
  @ApiProperty({ example: 'Edificio Residencial Las Palmas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Proyecto de 24 viviendas en Málaga' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectType, default: ProjectType.OTHER })
  @IsOptional()
  @IsEnum(ProjectType)
  type?: ProjectType;

  @ApiPropertyOptional({ example: 'C/ Gran Vía 45, Málaga' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 'EXP-2024-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
