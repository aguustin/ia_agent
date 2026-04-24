export declare class DirectMessageDto {
    content: string;
    sessionId?: string;
}
export interface DirectChatResponse {
    sessionId: string;
    userMessage: {
        id: string;
        role: string;
        content: string;
        createdAt: Date;
    };
    assistantMessage: {
        id: string;
        role: string;
        content: string;
        createdAt: Date;
    };
}
