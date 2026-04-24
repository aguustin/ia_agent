import { Response } from 'express';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { DirectMessageDto } from './dto/direct-message.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    sendDirectMessage(projectId: string, dto: DirectMessageDto, user: AuthenticatedUser): Promise<import("./dto/direct-message.dto").DirectChatResponse>;
    createSession(projectId: string, dto: CreateSessionDto, user: AuthenticatedUser): Promise<import("./entities/chat-session.entity").ChatSession>;
    findSessions(projectId: string, pagination: PaginationDto, user: AuthenticatedUser): Promise<import("@common/dto/pagination.dto").PaginatedResult<import("./entities/chat-session.entity").ChatSession>>;
    findSession(sessionId: string, user: AuthenticatedUser): Promise<import("./entities/chat-session.entity").ChatSession>;
    sendMessage(projectId: string, sessionId: string, dto: SendMessageDto, user: AuthenticatedUser): Promise<import("./entities/chat-message.entity").ChatMessage>;
    streamMessage(projectId: string, sessionId: string, dto: SendMessageDto, user: AuthenticatedUser, res: Response): Observable<MessageEvent>;
}
