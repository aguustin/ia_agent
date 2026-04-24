"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const rxjs_1 = require("rxjs");
const chat_session_entity_1 = require("./entities/chat-session.entity");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const chat_context_service_1 = require("./services/chat-context.service");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const domain_exception_1 = require("../../common/exceptions/domain.exception");
const ai_provider_interface_1 = require("../../providers/ai/ai-provider.interface");
const projects_service_1 = require("../projects/projects.service");
const MAX_HISTORY_MESSAGES = 20;
let ChatService = ChatService_1 = class ChatService {
    constructor(sessionRepo, messageRepo, ai, projectsService, chatContextService) {
        this.sessionRepo = sessionRepo;
        this.messageRepo = messageRepo;
        this.ai = ai;
        this.projectsService = projectsService;
        this.chatContextService = chatContextService;
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    async createSession(projectId, dto, actor) {
        await this.projectsService.findById(projectId, actor.tenantId);
        const session = this.sessionRepo.create({
            projectId,
            userId: actor.id,
            tenantId: actor.tenantId,
            title: dto.title ?? null,
        });
        return this.sessionRepo.save(session);
    }
    async findSessions(projectId, actor, pagination) {
        await this.projectsService.findById(projectId, actor.tenantId);
        const [data, total] = await this.sessionRepo.findAndCount({
            where: { projectId, tenantId: actor.tenantId, userId: actor.id },
            order: { updatedAt: 'DESC' },
            skip: pagination.skip,
            take: pagination.limit,
        });
        return (0, pagination_dto_1.paginate)(data, total, pagination);
    }
    async findSessionById(sessionId, tenantId) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId, tenantId },
            relations: ['messages'],
            order: { messages: { createdAt: 'ASC' } },
        });
        if (!session)
            throw new domain_exception_1.ResourceNotFoundException('ChatSession', sessionId);
        return session;
    }
    async sendMessage(sessionId, projectId, dto, actor) {
        const session = await this.resolveSession(sessionId, projectId, actor.tenantId);
        const userMessage = await this.messageRepo.save(this.messageRepo.create({
            sessionId: session.id,
            tenantId: actor.tenantId,
            role: chat_message_entity_1.MessageRole.USER,
            content: dto.content,
        }));
        const [systemContext, history] = await Promise.all([
            this.chatContextService.buildSystemContext(projectId, actor.tenantId),
            this.getHistory(session.id),
        ]);
        const responseContent = await this.ai.chat({
            messages: [...history, { role: 'user', content: dto.content }],
            systemContext,
        });
        const assistantMessage = await this.messageRepo.save(this.messageRepo.create({
            sessionId: session.id,
            tenantId: actor.tenantId,
            role: chat_message_entity_1.MessageRole.ASSISTANT,
            content: responseContent,
        }));
        await this.sessionRepo.update(session.id, { updatedAt: new Date() });
        this.logger.log(`Message answered — session: ${sessionId}, chars: ${responseContent.length}`);
        return assistantMessage;
    }
    streamMessage(sessionId, projectId, dto, actor) {
        return new rxjs_1.Observable((subscriber) => {
            (async () => {
                try {
                    await this.resolveSession(sessionId, projectId, actor.tenantId);
                    await this.messageRepo.save(this.messageRepo.create({
                        sessionId,
                        tenantId: actor.tenantId,
                        role: chat_message_entity_1.MessageRole.USER,
                        content: dto.content,
                    }));
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
                        subscriber.next({ data: JSON.stringify({ chunk }) });
                    }
                    await this.messageRepo.save(this.messageRepo.create({
                        sessionId,
                        tenantId: actor.tenantId,
                        role: chat_message_entity_1.MessageRole.ASSISTANT,
                        content: fullResponse,
                    }));
                    await this.sessionRepo.update(sessionId, { updatedAt: new Date() });
                    subscriber.next({ data: JSON.stringify({ done: true }) });
                    subscriber.complete();
                }
                catch (error) {
                    subscriber.error(error);
                }
            })();
        });
    }
    async sendDirectMessage(projectId, dto, actor) {
        await this.projectsService.findById(projectId, actor.tenantId);
        const session = dto.sessionId
            ? await this.resolveSession(dto.sessionId, projectId, actor.tenantId)
            : await this.findOrCreateSession(projectId, actor);
        const userMessage = await this.messageRepo.save(this.messageRepo.create({
            sessionId: session.id,
            tenantId: actor.tenantId,
            role: chat_message_entity_1.MessageRole.USER,
            content: dto.content,
        }));
        const [systemContext, history] = await Promise.all([
            this.chatContextService.buildSystemContext(projectId, actor.tenantId),
            this.getHistory(session.id),
        ]);
        const responseContent = await this.ai.chat({
            messages: [...history, { role: 'user', content: dto.content }],
            systemContext,
        });
        const assistantMessage = await this.messageRepo.save(this.messageRepo.create({
            sessionId: session.id,
            tenantId: actor.tenantId,
            role: chat_message_entity_1.MessageRole.ASSISTANT,
            content: responseContent,
        }));
        await this.sessionRepo.update(session.id, { updatedAt: new Date() });
        this.logger.log(`Direct message answered — project: ${projectId}, session: ${session.id}, ` +
            `user: ${actor.id}, response chars: ${responseContent.length}`);
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
    async resolveSession(sessionId, projectId, tenantId) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId, tenantId } });
        if (!session || session.projectId !== projectId) {
            throw new domain_exception_1.ResourceNotFoundException('ChatSession', sessionId);
        }
        return session;
    }
    async findOrCreateSession(projectId, actor) {
        const existing = await this.sessionRepo.findOne({
            where: { projectId, userId: actor.id, tenantId: actor.tenantId },
            order: { updatedAt: 'DESC' },
        });
        if (existing)
            return existing;
        return this.sessionRepo.save(this.sessionRepo.create({
            projectId,
            userId: actor.id,
            tenantId: actor.tenantId,
            title: null,
        }));
    }
    async getHistory(sessionId) {
        const messages = await this.messageRepo.find({
            where: { sessionId },
            order: { createdAt: 'ASC' },
            take: MAX_HISTORY_MESSAGES,
        });
        return messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_session_entity_1.ChatSession)),
    __param(1, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __param(2, (0, common_1.Inject)(ai_provider_interface_1.AI_PROVIDER_TOKEN)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, Object, projects_service_1.ProjectsService,
        chat_context_service_1.ChatContextService])
], ChatService);
//# sourceMappingURL=chat.service.js.map