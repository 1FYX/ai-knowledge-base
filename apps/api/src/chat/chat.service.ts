import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async listSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async createSession(userId: string, dto: any) {
    return this.prisma.chatSession.create({
      data: { userId, ...dto },
    });
  }

  async getSession(id: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        knowledgeBase: { select: { id: true, name: true } },
      },
    });
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  async deleteSession(id: string) {
    return this.prisma.chatSession.delete({ where: { id } });
  }

  async sendMessage(sessionId: string, dto: any, userId: string) {
    const session = await this.getSession(sessionId);
    if (session.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'USER',
        content: dto.content,
      },
    });

    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: 'This is a placeholder response. Connect to OpenAI for real responses.',
      },
    });

    return assistantMsg;
  }

  async streamMessage(sessionId: string, dto: any, userId: string): Promise<Observable<MessageEvent>> {
    const subject = new Subject<MessageEvent>();

    // Save user message
    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'USER', content: dto.content },
    });

    // Stream placeholder (replace with OpenAI streaming)
    const words = 'This is a placeholder streaming response. Connect to OpenAI API with SSE for real streaming.'.split(' ');
    let fullText = '';

    const stream = async () => {
      for (const word of words) {
        fullText += word + ' ';
        subject.next(new MessageEvent('message', { data: JSON.stringify({ chunk: word + ' ' }) }));
        await new Promise((r) => setTimeout(r, 100));
      }
      subject.next(new MessageEvent('message', { data: JSON.stringify({ done: true }) }));

      await this.prisma.chatMessage.create({
        data: { sessionId, role: 'ASSISTANT', content: fullText.trim() },
      });

      subject.complete();
    };

    stream().catch((err) => subject.error(err));
    return subject.asObservable();
  }
}
