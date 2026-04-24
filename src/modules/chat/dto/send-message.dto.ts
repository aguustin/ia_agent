import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: '¿Cuáles son los problemas críticos de cumplimiento encontrados?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({ default: false, description: 'Enable SSE streaming response' })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
