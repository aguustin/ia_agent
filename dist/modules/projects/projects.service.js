"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_entity_1 = require("./entities/project.entity");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const domain_exception_1 = require("../../common/exceptions/domain.exception");
const user_entity_1 = require("../users/entities/user.entity");
let ProjectsService = class ProjectsService {
    constructor(projectRepo) {
        this.projectRepo = projectRepo;
    }
    async create(dto, actor) {
        const project = this.projectRepo.create({
            ...dto,
            tenantId: actor.tenantId,
            ownerId: actor.id,
        });
        return this.projectRepo.save(project);
    }
    async findAll(tenantId, pagination, filters) {
        const query = this.projectRepo
            .createQueryBuilder('project')
            .where('project.tenantId = :tenantId', { tenantId })
            .andWhere('project.status != :archived', { archived: project_entity_1.ProjectStatus.ARCHIVED })
            .leftJoinAndSelect('project.owner', 'owner')
            .orderBy('project.createdAt', 'DESC')
            .skip(pagination.skip)
            .take(pagination.limit);
        if (filters?.status) {
            query.andWhere('project.status = :status', { status: filters.status });
        }
        const [data, total] = await query.getManyAndCount();
        return (0, pagination_dto_1.paginate)(data, total, pagination);
    }
    async findById(id, tenantId) {
        const project = await this.projectRepo.findOne({
            where: { id, tenantId },
            relations: ['owner'],
        });
        if (!project)
            throw new domain_exception_1.ResourceNotFoundException('Project', id);
        return project;
    }
    async update(id, dto, actor) {
        const project = await this.findById(id, actor.tenantId);
        this.assertCanModify(project, actor);
        Object.assign(project, dto);
        return this.projectRepo.save(project);
    }
    async archive(id, actor) {
        const project = await this.findById(id, actor.tenantId);
        this.assertCanModify(project, actor);
        project.status = project_entity_1.ProjectStatus.ARCHIVED;
        await this.projectRepo.save(project);
    }
    assertCanModify(project, actor) {
        const isOwner = project.ownerId === actor.id;
        const isAdmin = actor.role === user_entity_1.UserRole.TENANT_ADMIN || actor.role === user_entity_1.UserRole.SUPER_ADMIN;
        if (!isOwner && !isAdmin) {
            throw new domain_exception_1.ForbiddenDomainException('You do not have permission to modify this project');
        }
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map