import { Controller, Get, Post, Delete, Param, Body, UseGuards, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
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

  @Sse('sessions/:id/messages/stream')
  @UseGuards(JwtAuthGuard)
  async streamMessage(
    @Param('id') sessionId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: any,
  ): Promise<Observable<MessageEvent>> {
    return this.chatService.streamMessage(sessionId, dto, user.sub);
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
