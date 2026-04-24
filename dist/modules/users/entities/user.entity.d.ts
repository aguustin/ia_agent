import { Tenant } from '@modules/tenants/entities/tenant.entity';
export declare enum UserRole {
    SUPER_ADMIN = "super_admin",
    TENANT_ADMIN = "tenant_admin",
    ANALYST = "analyst",
    VIEWER = "viewer"
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    refreshTokenHash: string | null;
    lastLoginAt: Date | null;
    tenantId: string;
    tenant: Tenant;
    createdAt: Date;
    updatedAt: Date;
    get fullName(): string;
}
