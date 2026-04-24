import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IssueType, IssueSeverity } from '@providers/ai/ai-provider.interface';
import { AnalysisStatus } from '../entities/analysis.entity';
import { PreValidationStatus } from '../entities/pre-validation-record.entity';

export class IssueDto {
  @ApiProperty({ enum: IssueSeverity })
  severity: IssueSeverity;

  @ApiProperty({ enum: IssueType })
  type: IssueType;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ nullable: true })
  location: string | null;

  @ApiPropertyOptional({ nullable: true })
  recommendation: string | null;

  @ApiPropertyOptional({ nullable: true })
  regulation: string | null;
}

export class ComplianceDto {
  @ApiProperty()
  analysisId: string;

  @ApiProperty({ enum: AnalysisStatus })
  status: AnalysisStatus;

  @ApiPropertyOptional({ type: Number, nullable: true })
  complianceScore: number | null;

  @ApiPropertyOptional({ nullable: true })
  summary: string | null;

  @ApiProperty({ type: [IssueDto] })
  issues: IssueDto[];

  @ApiPropertyOptional({ nullable: true })
  errorMessage: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt: Date | null;
}

export class PreValidationSummaryDto {
  @ApiProperty()
  recordId: string;

  @ApiProperty({ enum: PreValidationStatus })
  status: PreValidationStatus;

  @ApiProperty({ type: [String] })
  faltantes: string[];

  @ApiProperty({ type: [String] })
  errores: string[];

  @ApiProperty({ type: [String] })
  advertencias: string[];

  @ApiPropertyOptional({ nullable: true })
  completedAt: Date | null;
}

export class DocumentAnalysisSummaryDto {
  @ApiProperty({ format: 'uuid' })
  documentId: string;

  @ApiPropertyOptional({ type: ComplianceDto, nullable: true })
  compliance: ComplianceDto | null;

  @ApiPropertyOptional({ type: PreValidationSummaryDto, nullable: true })
  preValidation: PreValidationSummaryDto | null;
}
