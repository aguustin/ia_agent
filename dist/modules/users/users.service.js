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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("./entities/user.entity");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const domain_exception_1 = require("../../common/exceptions/domain.exception");
const BCRYPT_ROUNDS = 12;
let UsersService = class UsersService {
    constructor(userRepo) {
        this.userRepo = userRepo;
    }
    async create(dto, tenantId) {
        const existing = await this.userRepo.findOne({
            where: { email: dto.email, tenantId },
        });
        if (existing) {
            throw new domain_exception_1.ConflictException(`User with email '${dto.email}' already exists in this organization`);
        }
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const user = this.userRepo.create({
            ...dto,
            passwordHash,
            tenantId,
            role: dto.role ?? user_entity_1.UserRole.ANALYST,
        });
        return this.userRepo.save(user);
    }
    async findAll(tenantId, pagination) {
        const [data, total] = await this.userRepo.findAndCount({
            where: { tenantId, isActive: true },
            order: { createdAt: 'DESC' },
            skip: pagination.skip,
            take: pagination.limit,
        });
        return (0, pagination_dto_1.paginate)(data, total, pagination);
    }
    async findById(id, tenantId) {
        const user = await this.userRepo.findOne({ where: { id, tenantId } });
        if (!user)
            throw new domain_exception_1.ResourceNotFoundException('User', id);
        return user;
    }
    async findByEmailWithCredentials(email, tenantId) {
        const query = this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .addSelect('user.refreshTokenHash')
            .where('user.email = :email', { email });
        if (tenantId) {
            query.andWhere('user.tenantId = :tenantId', { tenantId });
        }
        return query.getOne();
    }
    async findByIdWithRefreshToken(id) {
        return this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.refreshTokenHash')
            .where('user.id = :id', { id })
            .getOne();
    }
    async update(id, tenantId, dto, actor) {
        const user = await this.findById(id, tenantId);
        if (dto.role && dto.role === user_entity_1.UserRole.SUPER_ADMIN && actor.role !== user_entity_1.UserRole.SUPER_ADMIN) {
            throw new domain_exception_1.ForbiddenDomainException('Only super admins can assign the super_admin role');
        }
        Object.assign(user, dto);
        return this.userRepo.save(user);
    }
    async deactivate(id, tenantId) {
        const user = await this.findById(id, tenantId);
        user.isActive = false;
        await this.userRepo.save(user);
    }
    async setRefreshToken(userId, refreshToken) {
        const hash = refreshToken ? await bcrypt.hash(refreshToken, BCRYPT_ROUNDS) : null;
        await this.userRepo.update(userId, { refreshTokenHash: hash });
    }
    async updateLastLogin(userId) {
        await this.userRepo.update(userId, { lastLoginAt: new Date() });
    }
    async verifyPassword(plain, hash) {
        return bcrypt.compare(plain, hash);
    }
    async verifyRefreshToken(plain, hash) {
        return bcrypt.compare(plain, hash);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map