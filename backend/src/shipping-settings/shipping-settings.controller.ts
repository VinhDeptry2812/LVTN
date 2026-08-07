import { Controller, Get, Body, Put, UseGuards } from '@nestjs/common';
import { ShippingSettingsService } from './shipping-settings.service';
import { UpdateShippingSettingDto } from './dto/update-shipping-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('shipping-settings')
export class ShippingSettingsController {
  constructor(private readonly shippingSettingsService: ShippingSettingsService) {}

  @Get()
  async getSettings() {
    return this.shippingSettingsService.getSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put()
  async updateSettings(@Body() dto: UpdateShippingSettingDto) {
    return this.shippingSettingsService.updateSettings(dto);
  }
}
