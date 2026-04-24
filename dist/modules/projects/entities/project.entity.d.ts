import { User } from '@modules/users/entities/user.entity';
import { Tenant } from '@modules/tenants/entities/tenant.entity';
export declare enum ProjectStatus {
    DRAFT = "draft",
    IN_REVIEW = "in_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    ARCHIVED = "archived"
}
export declare enum ProjectType {
    RESIDENTIAL = "residential",
    COMMERCIAL = "commercial",
    INDUSTRIAL = "industrial",
    INFRASTRUCTURE = "infrastructure",
    RENOVATION = "renovation",
    OTHER = "other"
}
export declare class Project {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    type: ProjectType;
    location: string | null;
    referenceNumber: string | null;
    metadata: Record<string, unknown> | null;
    tenantId: string;
    tenant: Tenant;
    ownerId: string;
    owner: User;
    createdAt: Date;
    updatedAt: Date;
}
