import { ChatSession } from './chat-session.entity';
export declare enum MessageRole {
    USER = "user",
    ASSISTANT = "assistant"
}
export declare class ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    sessionId: string;
    session: ChatSession;
    tenantId: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}
