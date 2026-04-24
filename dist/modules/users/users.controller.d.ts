import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(dto: CreateUserDto, user: AuthenticatedUser): Promise<import("./entities/user.entity").User>;
    findAll(pagination: PaginationDto, user: AuthenticatedUser): Promise<import("@common/dto/pagination.dto").PaginatedResult<import("./entities/user.entity").User>>;
    findOne(id: string, user: AuthenticatedUser): Promise<import("./entities/user.entity").User>;
    update(id: string, dto: UpdateUserDto, user: AuthenticatedUser): Promise<import("./entities/user.entity").User>;
    remove(id: string, user: AuthenticatedUser): Promise<void>;
}
