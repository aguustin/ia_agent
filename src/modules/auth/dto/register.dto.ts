import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { CreateTenantDto } from '@modules/tenants/dto/create-tenant.dto';

export class RegisterDto {
  @ApiProperty({ description: 'Organization details' })
  @ValidateNested()
  @Type(() => CreateTenantDto)
  @IsNotEmpty()
  organization: CreateTenantDto;

  @ApiProperty({ description: 'Admin user details' })
  @ValidateNested()
  @Type(() => CreateUserDto)
  @IsNotEmpty()
  admin: CreateUserDto;
}
