import { Project } from '@modules/projects/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
import { ChatMessage } from './chat-message.entity';
export declare class ChatSession {
    id: string;
    title: string | null;
    projectId: string;
    project: Project;
    userId: string;
    user: User;
    tenantId: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}
