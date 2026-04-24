import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { MAX_FILE_SIZE_BYTES } from './entities/document.entity';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Document file (max 100MB)' },
        documentType: {
          type: 'string',
          enum: ['architectural', 'structural', 'electrical', 'plumbing', 'hvac', 'survey', 'environmental', 'report', 'other'],
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a document directly to R2 storage' })
  upload(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.upload(projectId, file, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List documents for a project' })
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findAll(projectId, user.tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document metadata' })
  findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.findById(id, projectId, user.tenantId);
  }

  @Get(':id/download-url')
  @ApiOperation({
    summary: 'Get a time-limited presigned download URL (15 minutes)',
    description:
      'Returns a signed R2 URL valid for 15 minutes. Use this to let clients download the document without exposing storage credentials.',
  })
  getDownloadUrl(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.getSignedDownloadUrl(id, projectId, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document and its R2 object' })
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.remove(id, projectId, user);
  }
}
