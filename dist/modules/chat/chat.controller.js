"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const rxjs_1 = require("rxjs");
const chat_service_1 = require("./chat.service");
const create_session_dto_1 = require("./dto/create-session.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const direct_message_dto_1 = require("./dto/direct-message.dto");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    sendDirectMessage(projectId, dto, user) {
        return this.chatService.sendDirectMessage(projectId, dto, user);
    }
    createSession(projectId, dto, user) {
        return this.chatService.createSession(projectId, dto, user);
    }
    findSessions(projectId, pagination, user) {
        return this.chatService.findSessions(projectId, user, pagination);
    }
    findSession(sessionId, user) {
        return this.chatService.findSessionById(sessionId, user.tenantId);
    }
    sendMessage(projectId, sessionId, dto, user) {
        return this.chatService.sendMessage(sessionId, projectId, dto, user);
    }
    streamMessage(projectId, sessionId, dto, user, res) {
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');
        return this.chatService.streamMessage(sessionId, projectId, dto, user);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Send a message to the project assistant',
        description: 'Accepts a message and returns the AI response in a single call. ' +
            'Automatically manages sessions — pass `sessionId` to continue a conversation, ' +
            'or omit it to auto-resolve or create a session.',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Returns { sessionId, userMessage, assistantMessage }',
    }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, direct_message_dto_1.DirectMessageDto, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "sendDirectMessage", null);
__decorate([
    (0, common_1.Post)('sessions'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new chat session for a project' }),
    openapi.ApiResponse({ status: 201, type: require("./entities/chat-session.entity").ChatSession }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_session_dto_1.CreateSessionDto, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, swagger_1.ApiOperation)({ summary: 'List chat sessions for a project' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pagination_dto_1.PaginationDto, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "findSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:sessionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a chat session with its message history' }),
    openapi.ApiResponse({ status: 200, type: require("./entities/chat-session.entity").ChatSession }),
    __param(0, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "findSession", null);
__decorate([
    (0, common_1.Post)('sessions/:sessionId/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message within an explicit session' }),
    openapi.ApiResponse({ status: 201, type: require("./entities/chat-message.entity").ChatMessage }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, send_message_dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Sse)('sessions/:sessionId/messages/stream'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message with SSE streaming response' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('projectId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, send_message_dto_1.SendMessageDto, Object, Object]),
    __metadata("design:returntype", rxjs_1.Observable)
], ChatController.prototype, "streamMessage", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('chat'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('projects/:projectId/chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map