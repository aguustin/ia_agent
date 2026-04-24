import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ProjectStatus } from './entities/project.entity';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List projects for the current tenant' })
  @ApiQuery({ name: 'status', enum: ProjectStatus, required: false })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status: ProjectStatus | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.findAll(user.tenantId, pagination, { status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.findById(id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a project' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.projectsService.archive(id, user);
  }
}
