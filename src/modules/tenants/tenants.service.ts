import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ConflictException, ResourceNotFoundException } from '@common/exceptions/domain.exception';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Tenant with slug '${dto.slug}' already exists`);
    }

    const tenant = this.tenantRepo.create(dto);
    return this.tenantRepo.save(tenant);
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new ResourceNotFoundException('Tenant', id);
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({ where: { slug } });
  }

  async ensureActive(tenantId: string): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    if (!tenant.isActive) {
      throw new ConflictException('Tenant account is suspended');
    }
    return tenant;
  }
}
