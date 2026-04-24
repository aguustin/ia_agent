export declare enum IssueType {
    COMPLIANCE = "compliance",
    COMPLETENESS = "completeness",
    TECHNICAL = "technical",
    SAFETY = "safety",
    ENVIRONMENTAL = "environmental"
}
export declare enum IssueSeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
    INFO = "info"
}
export interface AnalysisIssueResult {
    type: IssueType;
    severity: IssueSeverity;
    description: string;
    location?: string;
    recommendation?: string;
    regulation?: string;
}
export interface DocumentAnalysisRequest {
    documentContent: string;
    documentName: string;
    documentType: string;
    projectName: string;
    projectDescription?: string;
}
export interface DocumentAnalysisResult {
    summary: string;
    complianceScore: number;
    issues: AnalysisIssueResult[];
    recommendations: string[];
    metadata: {
        pagesAnalyzed: number;
        analysisVersion: string;
        model: string;
    };
}
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface ChatRequest {
    messages: ChatMessage[];
    systemContext: string;
    maxTokens?: number;
}
export interface PreValidationRequest {
    documentContent: string;
    documentName: string;
    documentType: string;
    pageCount: number;
    contentTruncated: boolean;
}
export interface PreValidationResult {
    faltantes: string[];
    errores: string[];
    advertencias: string[];
}
export declare const AI_PROVIDER_TOKEN = "AI_PROVIDER";
export interface IAIProvider {
    analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult>;
    preValidateDocument(request: PreValidationRequest): Promise<PreValidationResult>;
    chat(request: ChatRequest): Promise<string>;
    chatStream(request: ChatRequest): AsyncIterable<string>;
}
