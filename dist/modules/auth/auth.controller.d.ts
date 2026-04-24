import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { RefreshTokenPayload } from './strategies/jwt-refresh.strategy';
import { UsersService } from '@modules/users/users.service';
export declare class AuthController {
    private readonly authService;
    private readonly usersService;
    constructor(authService: AuthService, usersService: UsersService);
    register(dto: RegisterDto): Promise<import("./auth.service").AuthResponse>;
    login(dto: LoginDto): Promise<import("./auth.service").AuthResponse>;
    refresh(user: RefreshTokenPayload): Promise<import("./auth.service").TokenPair>;
    logout(user: AuthenticatedUser): Promise<void>;
    me(user: AuthenticatedUser): Promise<import("../users/entities/user.entity").User>;
}
