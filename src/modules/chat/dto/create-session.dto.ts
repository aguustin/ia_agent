import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @ApiPropertyOptional({ example: 'Consulta sobre memoria descriptiva' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
