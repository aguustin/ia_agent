import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage, MessageRole } from './entities/chat-message.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { DirectMessageDto, DirectChatResponse } from './dto/direct-message.dto';
import { ChatContextService } from './services/chat-context.service';
import { PaginationDto, paginate, PaginatedResult } from '@common/dto/pagination.dto';
import { ResourceNotFoundException } from '@common/exceptions/domain.exception';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import {
  IAIProvider,
  AI_PROVIDER_TOKEN,
  ChatMessage as AIChatMessage,
} from '@providers/ai/ai-provider.interface';
import { ProjectsService } from '@modules/projects/projects.service';

/** Max messages from history forwarded to the LLM — keeps prompt size predictable */
const MAX_HISTORY_MESSAGES = 20;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @Inject(AI_PROVIDER_TOKEN)
    private readonly ai: IAIProvider,
    private readonly projectsService: ProjectsService,
    private readonly chatContextService: ChatContextService,
  ) {}

  // ---------------------------------------------------------------------------
  // Session management
  // ---------------------------------------------------------------------------

  async createSession(
    projectId: string,
    dto: CreateSessionDto,
    actor: AuthenticatedUser,
  ): Promise<ChatSession> {
    await this.projectsService.findById(projectId, actor.tenantId);

    const session = this.sessionRepo.create({
      projectId,
      userId: actor.id,
      tenantId: actor.tenantId,
      title: dto.title ?? null,
    });

    return this.sessionRepo.save(session);
  }

  async findSessions(
    projectId: string,
    actor: AuthenticatedUser,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<ChatSession>> {
    await this.projectsService.findById(projectId, actor.tenantId);

    const [data, total] = await this.sessionRepo.findAndCount({
      where: { projectId, tenantId: actor.tenantId, userId: actor.id },
      order: { updatedAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return paginate(data, total, pagination);
  }

  async findSessionById(sessionId: string, tenantId: string): Promise<ChatSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, tenantId },
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } } as Parameters<
        typeof this.sessionRepo.findOne
      >[0]['order'],
    });

    if (!session) throw new ResourceNotFoundException('ChatSession', sessionId);
    return session;
  }

  // ---------------------------------------------------------------------------
  // Messaging — session-scoped (granular API)
  // ---------------------------------------------------------------------------

  async sendMessage(
    sessionId: string,
    projectId: string,
    dto: SendMessageDto,
    actor: AuthenticatedUser,
  ): Promise<ChatMessage> {
    const session = await this.resolveSession(sessionId, projectId, actor.tenantId);

    const userMessage = await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        tenantId: actor.tenantId,
        role: MessageRole.USER,
        content: dto.content,
      }),
    );

    const [systemContext, history] = await Promise.all([
      this.chatContextService.buildSystemContext(projectId, actor.tenantId),
      this.getHistory(session.id),
    ]);

    const responseContent = await this.ai.chat({
      messages: [...history, { role: 'user', content: dto.content }],
      systemContext,
    });

    const assistantMessage = await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        tenantId: actor.tenantId,
        role: MessageRole.ASSISTANT,
        content: responseContent,
      }),
    );

    await this.sessionRepo.update(session.id, { updatedAt: new Date() });

    this.logger.log(
      `Message answered — session: ${sessionId}, chars: ${responseContent.length}`,
    );

    return assistantMessage;
  }

  streamMessage(
    sessionId: string,
    projectId: string,
    dto: SendMessageDto,
    actor: AuthenticatedUser,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          await this.resolveSession(sessionId, projectId, actor.tenantId);

          await this.messageRepo.save(
            this.messageRepo.create({
              sessionId,
              tenantId: actor.tenantId,
              role: MessageRole.USER,
              content: dto.content,
            }),
          );

          const [systemContext, history] = await Promise.all([
            this.chatContextService.buildSystemContext(projectId, actor.tenantId),
            this.getHistory(sessionId),
          ]);

          let fullResponse = '';

          for await (const chunk of this.ai.chatStream({
            messages: [...history, { role: 'user', content: dto.content }],
            systemContext,
          })) {
            fullResponse += chunk;
            subscriber.next({ data: JSON.stringify({ chunk }) } as MessageEvent);
          }

          await this.messageRepo.save(
            this.messageRepo.create({
              sessionId,
              tenantId: actor.tenantId,
              role: MessageRole.ASSISTANT,
              content: fullResponse,
            }),
          );

          await this.sessionRepo.update(sessionId, { updatedAt: new Date() });

          subscriber.next({ data: JSON.stringify({ done: true }) } as MessageEvent);
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }

  // ---------------------------------------------------------------------------
  // Messaging — direct / auto-session (simple API)
  // ---------------------------------------------------------------------------

  /**
   * Accepts a message for a project, auto-resolves or creates a session, and
   * returns both messages in a single response. Designed for clients that
   * don't want to manage sessions explicitly.
   *
   * Session resolution order:
   *   1. `dto.sessionId` provided → validate ownership and use it.
   *   2. No sessionId → find the most recent session for user+project.
   *   3. None found → create a new session.
   */
  async sendDirectMessage(
    projectId: string,
    dto: DirectMessageDto,
    actor: AuthenticatedUser,
  ): Promise<DirectChatResponse> {
    await this.projectsService.findById(projectId, actor.tenantId);

    const session = dto.sessionId
      ? await this.resolveSession(dto.sessionId, projectId, actor.tenantId)
      : await this.findOrCreateSession(projectId, actor);

    const userMessage = await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        tenantId: actor.tenantId,
        role: MessageRole.USER,
        content: dto.content,
      }),
    );

    const [systemContext, history] = await Promise.all([
      this.chatContextService.buildSystemContext(projectId, actor.tenantId),
      this.getHistory(session.id),
    ]);

    const responseContent = await this.ai.chat({
      messages: [...history, { role: 'user', content: dto.content }],
      systemContext,
    });

    const assistantMessage = await this.messageRepo.save(
      this.messageRepo.create({
        sessionId: session.id,
        tenantId: actor.tenantId,
        role: MessageRole.ASSISTANT,
        content: responseContent,
      }),
    );

    await this.sessionRepo.update(session.id, { updatedAt: new Date() });

    this.logger.log(
      `Direct message answered — project: ${projectId}, session: ${session.id}, ` +
        `user: ${actor.id}, response chars: ${responseContent.length}`,
    );

    return {
      sessionId: session.id,
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async resolveSession(
    sessionId: string,
    projectId: string,
    tenantId: string,
  ): Promise<ChatSession> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, tenantId } });
    if (!session || session.projectId !== projectId) {
      throw new ResourceNotFoundException('ChatSession', sessionId);
    }
    return session;
  }

  private async findOrCreateSession(
    projectId: string,
    actor: AuthenticatedUser,
  ): Promise<ChatSession> {
    const existing = await this.sessionRepo.findOne({
      where: { projectId, userId: actor.id, tenantId: actor.tenantId },
      order: { updatedAt: 'DESC' },
    });

    if (existing) return existing;

    return this.sessionRepo.save(
      this.sessionRepo.create({
        projectId,
        userId: actor.id,
        tenantId: actor.tenantId,
        title: null,
      }),
    );
  }

  private async getHistory(sessionId: string): Promise<AIChatMessage[]> {
    const messages = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: MAX_HISTORY_MESSAGES,
    });

    return messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }
}
