import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, PaginatedResult } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
export declare class UsersService {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    create(dto: CreateUserDto, tenantId: string): Promise<User>;
    findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<User>>;
    findById(id: string, tenantId: string): Promise<User>;
    findByEmailWithCredentials(email: string, tenantId?: string): Promise<User | null>;
    findByIdWithRefreshToken(id: string): Promise<User | null>;
    update(id: string, tenantId: string, dto: UpdateUserDto, actor: AuthenticatedUser): Promise<User>;
    deactivate(id: string, tenantId: string): Promise<void>;
    setRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
    updateLastLogin(userId: string): Promise<void>;
    verifyPassword(plain: string, hash: string): Promise<boolean>;
    verifyRefreshToken(plain: string, hash: string): Promise<boolean>;
}
