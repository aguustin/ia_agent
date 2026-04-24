import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { DocumentAnalysisSummaryDto } from './dto/document-analysis-summary.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

@ApiTags('analysis')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  // ---------------------------------------------------------------------------
  // Full compliance analysis
  // ---------------------------------------------------------------------------

  @Post('documents/:documentId/analyses')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger full AI compliance analysis for a document' })
  triggerAnalysis(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysisService.triggerAnalysis(documentId, projectId, user);
  }

  @Get('documents/:documentId/analysis')
  @ApiOperation({
    summary: 'Get latest analysis summary for a document',
    description:
      'Returns the most recent compliance analysis (with issues sorted by severity) and the ' +
      'most recent pre-validation record in a single call. ' +
      'Both fields are null when no job has run yet for that type.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: DocumentAnalysisSummaryDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Document not found.' })
  getDocumentAnalysisSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentAnalysisSummaryDto> {
    return this.analysisService.getDocumentAnalysisSummary(documentId, projectId, user.tenantId);
  }

  @Get('documents/:documentId/analyses')
  @ApiOperation({ summary: 'List analyses for a specific document' })
  findByDocument(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysisService.findByDocument(documentId, projectId, user.tenantId, pagination);
  }

  @Get('analyses')
  @ApiOperation({ summary: 'List all analyses for a project' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysisService.findByProject(projectId, user.tenantId, pagination);
  }

  @Get('analyses/summary')
  @ApiOperation({ summary: 'Get compliance summary for a project' })
  getProjectSummary(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysisService.getProjectAnalysisSummary(projectId, user.tenantId);
  }

  @Get('analyses/:analysisId')
  @ApiOperation({ summary: 'Get analysis detail with all issues' })
  findOne(
    @Param('analysisId', ParseUUIDPipe) analysisId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysisService.findById(analysisId, user.tenantId);
  }

  // ---------------------------------------------------------------------------
  // Pre-validation
  // ---------------------------------------------------------------------------

  @Post('documents/:documentId/pre-validation')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger pre-validation for a document',
    description:
      'Enqueues a pre-validation job. Poll the returned record ID to check status and retrieve results (faltantes, errores, advertencias).',
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Job enqueued — poll for results.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'A pre-validation is already queued.' })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Document not yet uploaded.',
  })
  triggerPreValidation(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysisService.triggerPreValidation(documentId, projectId, user);
  }

  @Get('documents/:documentId/pre-validation')
  @ApiOperation({ summary: 'List pre-validation records for a document' })
  findPreValidationsByDocument(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysisService.findPreValidationsByDocument(
      documentId,
      projectId,
      user.tenantId,
      pagination,
    );
  }

  @Get('pre-validation/:recordId')
  @ApiOperation({
    summary: 'Get a pre-validation record by ID',
    description: 'Returns status and results once the job completes.',
  })
  findPreValidationById(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.analysisService.findPreValidationById(recordId, user.tenantId);
  }
}
