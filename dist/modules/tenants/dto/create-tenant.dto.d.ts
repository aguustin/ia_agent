import { TenantPlan } from '../entities/tenant.entity';
export declare class CreateTenantDto {
    name: string;
    slug: string;
    plan?: TenantPlan;
}
