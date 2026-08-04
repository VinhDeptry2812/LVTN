import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { SendChatMessageDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-product-description')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async generateDescription(
    @Body() body: { name: string; category: string; attributes: string },
  ) {
    const { name, category, attributes } = body;
    const description = await this.aiService.generateProductDescription(
      name,
      category,
      attributes,
    );

    return {
      message: 'Tạo mô tả thành công',
      data: description,
    };
  }

  @Post('chat')
  async chat(@Body() dto: SendChatMessageDto) {
    return this.aiService.chat(dto);
  }

  @Post('sync-embeddings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async syncEmbeddings() {
    return this.aiService.syncProductEmbeddings();
  }
}

