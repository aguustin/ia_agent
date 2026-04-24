import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '@modules/users/users.service';
import { TenantsService } from '@modules/tenants/tenants.service';
import { UserRole } from '@modules/users/entities/user.entity';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const tenant = await this.tenantsService.create(dto.organization);

    const user = await this.usersService.create(
      { ...dto.admin, role: UserRole.TENANT_ADMIN },
      tenant.id,
    );

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

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithCredentials(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.usersService.verifyPassword(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
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

  async refresh(userId: string, refreshToken: string): Promise<TokenPair> {
    const user = await this.usersService.findByIdWithRefreshToken(userId);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const tokenValid = await this.usersService.verifyRefreshToken(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!tokenValid) {
      await this.usersService.setRefreshToken(userId, null);
      throw new UnauthorizedException('Refresh token compromised — please login again');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tenantId);
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshToken(userId, null);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    tenantId: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role, tenantId };
    const accessExpiresIn = this.config.get<string>('jwt.accessExpiresIn', '15m');
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: accessExpiresIn };
  }
}
