import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto, paginate, PaginatedResult } from '@common/dto/pagination.dto';
import {
  ForbiddenDomainException,
  ResourceNotFoundException,
} from '@common/exceptions/domain.exception';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { UserRole } from '@modules/users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async create(dto: CreateProjectDto, actor: AuthenticatedUser): Promise<Project> {
    const project = this.projectRepo.create({
      ...dto,
      tenantId: actor.tenantId,
      ownerId: actor.id,
    });

    return this.projectRepo.save(project);
  }

  async findAll(
    tenantId: string,
    pagination: PaginationDto,
    filters?: { status?: ProjectStatus },
  ): Promise<PaginatedResult<Project>> {
    const query = this.projectRepo
      .createQueryBuilder('project')
      .where('project.tenantId = :tenantId', { tenantId })
      .andWhere('project.status != :archived', { archived: ProjectStatus.ARCHIVED })
      .leftJoinAndSelect('project.owner', 'owner')
      .orderBy('project.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    if (filters?.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    const [data, total] = await query.getManyAndCount();
    return paginate(data, total, pagination);
  }

  async findById(id: string, tenantId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id, tenantId },
      relations: ['owner'],
    });

    if (!project) throw new ResourceNotFoundException('Project', id);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, actor: AuthenticatedUser): Promise<Project> {
    const project = await this.findById(id, actor.tenantId);
    this.assertCanModify(project, actor);

    Object.assign(project, dto);
    return this.projectRepo.save(project);
  }

  async archive(id: string, actor: AuthenticatedUser): Promise<void> {
    const project = await this.findById(id, actor.tenantId);
    this.assertCanModify(project, actor);

    project.status = ProjectStatus.ARCHIVED;
    await this.projectRepo.save(project);
  }

  private assertCanModify(project: Project, actor: AuthenticatedUser): void {
    const isOwner = project.ownerId === actor.id;
    const isAdmin = actor.role === UserRole.TENANT_ADMIN || actor.role === UserRole.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenDomainException('You do not have permission to modify this project');
    }
  }
}
