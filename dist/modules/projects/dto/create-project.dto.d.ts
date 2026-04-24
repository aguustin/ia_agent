import { ProjectType } from '../entities/project.entity';
export declare class CreateProjectDto {
    name: string;
    description?: string;
    type?: ProjectType;
    location?: string;
    referenceNumber?: string;
    metadata?: Record<string, unknown>;
}
