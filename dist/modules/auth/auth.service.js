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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
const tenants_service_1 = require("../tenants/tenants.service");
const user_entity_1 = require("../users/entities/user.entity");
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, tenantsService, jwtService, config) {
        this.usersService = usersService;
        this.tenantsService = tenantsService;
        this.jwtService = jwtService;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        const tenant = await this.tenantsService.create(dto.organization);
        const user = await this.usersService.create({ ...dto.admin, role: user_entity_1.UserRole.TENANT_ADMIN }, tenant.id);
        this.logger.log(`New tenant registered: ${tenant.slug} by ${user.email}`);
        const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
        await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
            },
            tokens,
        };
    }
    async login(dto) {
        const user = await this.usersService.findByEmailWithCredentials(dto.email);
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordValid = await this.usersService.verifyPassword(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.tenantsService.ensureActive(user.tenantId);
        const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
        await Promise.all([
            this.usersService.setRefreshToken(user.id, tokens.refreshToken),
            this.usersService.updateLastLogin(user.id),
        ]);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
            },
            tokens,
        };
    }
    async refresh(userId, refreshToken) {
        const user = await this.usersService.findByIdWithRefreshToken(userId);
        if (!user || !user.refreshTokenHash) {
            throw new common_1.UnauthorizedException('Access denied');
        }
        const tokenValid = await this.usersService.verifyRefreshToken(refreshToken, user.refreshTokenHash);
        if (!tokenValid) {
            await this.usersService.setRefreshToken(userId, null);
            throw new common_1.UnauthorizedException('Refresh token compromised — please login again');
        }
        const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
        await this.usersService.setRefreshToken(user.id, tokens.refreshToken);
        return tokens;
    }
    async logout(userId) {
        await this.usersService.setRefreshToken(userId, null);
    }
    async generateTokens(userId, email, role, tenantId) {
        const payload = { sub: userId, email, role, tenantId };
        const accessExpiresIn = this.config.get('jwt.accessExpiresIn', '15m');
        const refreshExpiresIn = this.config.get('jwt.refreshExpiresIn', '7d');
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.config.getOrThrow('jwt.accessSecret'),
                expiresIn: accessExpiresIn,
            }),
            this.jwtService.signAsync(payload, {
                secret: this.config.getOrThrow('jwt.refreshSecret'),
                expiresIn: refreshExpiresIn,
            }),
        ]);
        return { accessToken, refreshToken, expiresIn: accessExpiresIn };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        tenants_service_1.TenantsService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map