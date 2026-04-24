import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TenantPlan } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiProperty({ example: 'Constructora Pérez SL' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'constructora-perez', description: 'URL-safe unique identifier' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @ApiPropertyOptional({ enum: TenantPlan, default: TenantPlan.FREE })
  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;
}
