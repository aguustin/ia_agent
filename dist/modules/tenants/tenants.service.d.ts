import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
export declare class TenantsService {
    private readonly tenantRepo;
    constructor(tenantRepo: Repository<Tenant>);
    create(dto: CreateTenantDto): Promise<Tenant>;
    findById(id: string): Promise<Tenant>;
    findBySlug(slug: string): Promise<Tenant | null>;
    ensureActive(tenantId: string): Promise<Tenant>;
}
