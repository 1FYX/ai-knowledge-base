import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateLlmConfigDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    const result = await this.usersService.findById(user.sub);
    return { success: true, data: result };
  }

  /** 获取当前用户的 LLM 配置（不返回明文 apiKey） */
  @Get('llm-config')
  @UseGuards(JwtAuthGuard)
  async getLlmConfig(@CurrentUser() user: any) {
    const data = await this.usersService.getLlmConfig(user.sub);
    return { success: true, data };
  }

  /** 更新当前用户的 LLM 配置（apiKey 加密入库） */
  @Put('llm-config')
  @UseGuards(JwtAuthGuard)
  async updateLlmConfig(@CurrentUser() user: any, @Body() dto: UpdateLlmConfigDto) {
    const data = await this.usersService.updateLlmConfig(user.sub, dto);
    return { success: true, data };
  }
}
