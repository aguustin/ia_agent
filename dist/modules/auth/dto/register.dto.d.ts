import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { CreateTenantDto } from '@modules/tenants/dto/create-tenant.dto';
export declare class RegisterDto {
    organization: CreateTenantDto;
    admin: CreateUserDto;
}
