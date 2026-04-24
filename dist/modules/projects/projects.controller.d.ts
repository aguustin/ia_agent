import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ProjectStatus } from './entities/project.entity';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    create(dto: CreateProjectDto, user: AuthenticatedUser): Promise<import("./entities/project.entity").Project>;
    findAll(pagination: PaginationDto, status: ProjectStatus | undefined, user: AuthenticatedUser): Promise<import("@common/dto/pagination.dto").PaginatedResult<import("./entities/project.entity").Project>>;
    findOne(id: string, user: AuthenticatedUser): Promise<import("./entities/project.entity").Project>;
    update(id: string, dto: UpdateProjectDto, user: AuthenticatedUser): Promise<import("./entities/project.entity").Project>;
    remove(id: string, user: AuthenticatedUser): Promise<void>;
}
