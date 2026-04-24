import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatContextService } from './services/chat-context.service';
import { ProjectsModule } from '@modules/projects/projects.module';
import { AnalysisModule } from '@modules/analysis/analysis.module';
import { Document } from '@modules/documents/entities/document.entity';
import { Analysis } from '@modules/analysis/entities/analysis.entity';
import { PreValidationRecord } from '@modules/analysis/entities/pre-validation-record.entity';
import { DocumentsModule } from '@modules/documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatSession,
      ChatMessage,
      // Entities queried by ChatContextService
      Document,
      Analysis,
      PreValidationRecord,
    ]),
    ProjectsModule,
    DocumentsModule,
    AnalysisModule,
  ],
  providers: [ChatService, ChatContextService],
  controllers: [ChatController],
})
export class ChatModule {}
