import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingSetting } from './shipping-setting.entity';
import { ShippingSettingsService } from './shipping-settings.service';
import { ShippingSettingsController } from './shipping-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShippingSetting])],
  controllers: [ShippingSettingsController],
  providers: [ShippingSettingsService],
  exports: [ShippingSettingsService],
})
export class ShippingSettingsModule {}
