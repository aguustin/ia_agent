import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, paginate, PaginatedResult } from '@common/dto/pagination.dto';
import {
  ConflictException,
  ForbiddenDomainException,
  ResourceNotFoundException,
} from '@common/exceptions/domain.exception';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto, tenantId: string): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email, tenantId },
    });
    if (existing) {
      throw new ConflictException(`User with email '${dto.email}' already exists in this organization`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.userRepo.create({
      ...dto,
      passwordHash,
      tenantId,
      role: dto.role ?? UserRole.ANALYST,
    });

    return this.userRepo.save(user);
  }

  async findAll(tenantId: string, pagination: PaginationDto): Promise<PaginatedResult<User>> {
    const [data, total] = await this.userRepo.findAndCount({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return paginate(data, total, pagination);
  }

  async findById(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new ResourceNotFoundException('User', id);
    return user;
  }

  async findByEmailWithCredentials(email: string, tenantId?: string): Promise<User | null> {
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

  async findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto, actor: AuthenticatedUser): Promise<User> {
    const user = await this.findById(id, tenantId);

    if (dto.role && dto.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenDomainException('Only super admins can assign the super_admin role');
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    const user = await this.findById(id, tenantId);
    user.isActive = false;
    await this.userRepo.save(user);
  }

  async setRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hash = refreshToken ? await bcrypt.hash(refreshToken, BCRYPT_ROUNDS) : null;
    await this.userRepo.update(userId, { refreshTokenHash: hash });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastLoginAt: new Date() });
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async verifyRefreshToken(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
