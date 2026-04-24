export declare enum TenantPlan {
    FREE = "free",
    STARTER = "starter",
    PROFESSIONAL = "professional",
    ENTERPRISE = "enterprise"
}
export interface TenantLimits {
    maxProjects: number;
    maxDocumentsPerProject: number;
    maxAnalysesPerMonth: number;
    maxStorageGb: number;
}
export declare class Tenant {
    id: string;
    slug: string;
    name: string;
    plan: TenantPlan;
    isActive: boolean;
    settings: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
    get limits(): TenantLimits;
}
