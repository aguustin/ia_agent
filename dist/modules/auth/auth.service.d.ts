import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@modules/users/users.service';
import { TenantsService } from '@modules/tenants/tenants.service';
import { UserRole } from '@modules/users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}
export interface AuthResponse {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        tenantId: string;
    };
    tokens: TokenPair;
}
export declare class AuthService {
    private readonly usersService;
    private readonly tenantsService;
    private readonly jwtService;
    private readonly config;
    private readonly logger;
    constructor(usersService: UsersService, tenantsService: TenantsService, jwtService: JwtService, config: ConfigService);
    register(dto: RegisterDto): Promise<AuthResponse>;
    login(dto: LoginDto): Promise<AuthResponse>;
    refresh(userId: string, refreshToken: string): Promise<TokenPair>;
    logout(userId: string): Promise<void>;
    private generateTokens;
}
