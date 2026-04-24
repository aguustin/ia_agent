import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class DirectMessageDto {
  @ApiProperty({ example: '¿Qué documentos faltan en este expediente?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({
    description:
      'Continue an existing session. Omit to auto-resolve the most recent session or create a new one.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

export interface DirectChatResponse {
  sessionId: string;
  userMessage: { id: string; role: string; content: string; createdAt: Date };
  assistantMessage: { id: string; role: string; content: string; createdAt: Date };
}
