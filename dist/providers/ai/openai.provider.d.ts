import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAIProvider, DocumentAnalysisRequest, DocumentAnalysisResult, PreValidationRequest, PreValidationResult, ChatRequest } from './ai-provider.interface';
export declare class OpenAIProvider implements IAIProvider, OnModuleInit {
    private readonly config;
    private readonly logger;
    private client;
    private model;
    constructor(config: ConfigService);
    onModuleInit(): void;
    analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult>;
    preValidateDocument(request: PreValidationRequest): Promise<PreValidationResult>;
    chat(request: ChatRequest): Promise<string>;
    chatStream(request: ChatRequest): AsyncIterable<string>;
}
