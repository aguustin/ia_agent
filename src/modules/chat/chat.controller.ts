import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Sse,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { DirectMessageDto } from './dto/direct-message.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';

@ApiTags('chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ---------------------------------------------------------------------------
  // Direct endpoint — POST /projects/:projectId/chat
  // No session management required from the client.
  // ---------------------------------------------------------------------------

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message to the project assistant',
    description:
      'Accepts a message and returns the AI response in a single call. ' +
      'Automatically manages sessions — pass `sessionId` to continue a conversation, ' +
      'or omit it to auto-resolve or create a session.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns { sessionId, userMessage, assistantMessage }',
  })
  sendDirectMessage(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: DirectMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.sendDirectMessage(projectId, dto, user);
  }

  // ---------------------------------------------------------------------------
  // Session management
  // ---------------------------------------------------------------------------

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new chat session for a project' })
  createSession(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.createSession(projectId, dto, user);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List chat sessions for a project' })
  findSessions(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.findSessions(projectId, user, pagination);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get a chat session with its message history' })
  findSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.findSessionById(sessionId, user.tenantId);
  }

  // ---------------------------------------------------------------------------
  // Session-scoped messaging
  // ---------------------------------------------------------------------------

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Send a message within an explicit session' })
  sendMessage(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.sendMessage(sessionId, projectId, dto, user);
  }

  @Sse('sessions/:sessionId/messages/stream')
  @ApiOperation({ summary: 'Send a message with SSE streaming response' })
  streamMessage(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Observable<MessageEvent> {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    return this.chatService.streamMessage(sessionId, projectId, dto, user);
  }
}
