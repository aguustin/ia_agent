import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto, PaginatedResult } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
export declare class ProjectsService {
    private readonly projectRepo;
    constructor(projectRepo: Repository<Project>);
    create(dto: CreateProjectDto, actor: AuthenticatedUser): Promise<Project>;
    findAll(tenantId: string, pagination: PaginationDto, filters?: {
        status?: ProjectStatus;
    }): Promise<PaginatedResult<Project>>;
    findById(id: string, tenantId: string): Promise<Project>;
    update(id: string, dto: UpdateProjectDto, actor: AuthenticatedUser): Promise<Project>;
    archive(id: string, actor: AuthenticatedUser): Promise<void>;
    private assertCanModify;
}
