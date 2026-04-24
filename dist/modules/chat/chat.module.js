"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const chat_session_entity_1 = require("./entities/chat-session.entity");
const chat_message_entity_1 = require("./entities/chat-message.entity");
const chat_service_1 = require("./chat.service");
const chat_controller_1 = require("./chat.controller");
const chat_context_service_1 = require("./services/chat-context.service");
const projects_module_1 = require("../projects/projects.module");
const analysis_module_1 = require("../analysis/analysis.module");
const document_entity_1 = require("../documents/entities/document.entity");
const analysis_entity_1 = require("../analysis/entities/analysis.entity");
const pre_validation_record_entity_1 = require("../analysis/entities/pre-validation-record.entity");
const documents_module_1 = require("../documents/documents.module");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                chat_session_entity_1.ChatSession,
                chat_message_entity_1.ChatMessage,
                document_entity_1.Document,
                analysis_entity_1.Analysis,
                pre_validation_record_entity_1.PreValidationRecord,
            ]),
            projects_module_1.ProjectsModule,
            documents_module_1.DocumentsModule,
            analysis_module_1.AnalysisModule,
        ],
        providers: [chat_service_1.ChatService, chat_context_service_1.ChatContextService],
        controllers: [chat_controller_1.ChatController],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map