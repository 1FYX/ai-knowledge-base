import { Controller, Get, Post, Delete, Param, Body, UseGuards, Res } from '@nestjs/common';
import * as express from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSessionDto, SendMessageDto } from './dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@CurrentUser() user: any) {
    const data = await this.chatService.listSessions(user.sub);
    return { success: true, data };
  }

  @Post('sessions')
  @UseGuards(JwtAuthGuard)
  async createSession(@CurrentUser() user: any, @Body() dto: CreateSessionDto) {
    const data = await this.chatService.createSession(user.sub, dto);
    return { success: true, data };
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async getSession(@Param('id') id: string) {
    const data = await this.chatService.getSession(id);
    return { success: true, data };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async deleteSession(@Param('id') id: string) {
    await this.chatService.deleteSession(id);
    return { success: true };
  }

  /**
   * 流式发送消息（SSE over POST）。
   * 不用 @Sse 是因为它强制 GET、且 EventSource 无法设置 Authorization 头。
   * 这里改用 POST + fetch ReadableStream（行业标准做法，如 ChatGPT）：
   *   - 客户端用 fetch 发 POST，带 Bearer token 与 body
   *   - 服务端手动写 SSE 帧（`data: {...}\n\n`），最后 [DONE]
   */
  @Post('sessions/:id/messages/stream')
  @UseGuards(JwtAuthGuard)
  async streamMessage(
    @Param('id') sessionId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: any,
    @Res() res: express.Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx 不缓冲
    res.flushHeaders?.();

    try {
      await this.chatService.streamMessage(sessionId, dto, user.sub, {
        onChunk: (chunk: string) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
        onSources: (sources: unknown) => {
          res.write(`data: ${JSON.stringify({ sources })}\n\n`);
        },
        onDone: () => {
          res.write(`data: [DONE]\n\n`);
        },
        onError: (message: string) => {
          res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        },
      });
    } catch {
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('sessions/:id/messages')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @Param('id') sessionId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.chatService.sendMessage(sessionId, dto, user.sub);
    return { success: true, data };
  }
}
