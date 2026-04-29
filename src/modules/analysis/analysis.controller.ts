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
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Observable, fromEvent, map, filter, timeout, catchError, EMPTY } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalysisService } from './analysis.service';
import { DocumentAnalysisSummaryDto } from './dto/document-analysis-summary.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

export interface AnalysisEvent {
  documentId: string;
  type: 'analysis' | 'pre-validation';
  status: 'completed' | 'failed';
  recordId: string;
  errorMessage?: string;
}

// SSE connections auto-close after 10 minutes of no completion event.
const SSE_TIMEOUT_MS = 10 * 60 * 1_000;

@ApiTags('analysis')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId')
export class AnalysisController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Full compliance analysis
  // ---------------------------------------------------------------------------

  @Post('documents/:documentId/analyses')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ analysis: { limit: 10, ttl: 60_000 } })
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

  @Sse('documents/:documentId/analysis/events')
  @ApiOperation({
    summary: 'SSE stream — fires once when the latest analysis job completes or fails',
    description:
      'Connect with Accept: text/event-stream. The server sends one event ' +
      '(status: completed | failed) and then closes the stream. ' +
      'Auto-closes after 10 minutes if no job finishes.',
  })
  analysisEvents(
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Observable<MessageEvent> {
    return (fromEvent(this.eventEmitter, 'analysis.done') as Observable<AnalysisEvent>).pipe(
      filter((e) => e.documentId === documentId && e.type === 'analysis'),
      map((e): MessageEvent => ({ data: e })),
      timeout({ first: SSE_TIMEOUT_MS, with: () => EMPTY }),
      catchError(() => EMPTY),
    );
  }

  @Sse('documents/:documentId/pre-validation/events')
  @ApiOperation({
    summary: 'SSE stream — fires once when the latest pre-validation job completes or fails',
  })
  preValidationEvents(
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Observable<MessageEvent> {
    return (fromEvent(this.eventEmitter, 'analysis.done') as Observable<AnalysisEvent>).pipe(
      filter((e) => e.documentId === documentId && e.type === 'pre-validation'),
      map((e): MessageEvent => ({ data: e })),
      timeout({ first: SSE_TIMEOUT_MS, with: () => EMPTY }),
      catchError(() => EMPTY),
    );
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
  @Throttle({ analysis: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Trigger pre-validation for a document',
    description:
      'Enqueues a pre-validation job. Poll the returned record ID or connect to the SSE stream to get notified on completion.',
  })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Job enqueued.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'A pre-validation is already queued.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Document not yet uploaded.' })
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
