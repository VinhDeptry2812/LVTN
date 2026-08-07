import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShippingSetting } from './shipping-setting.entity';
import { UpdateShippingSettingDto } from './dto/update-shipping-setting.dto';

@Injectable()
export class ShippingSettingsService {
  constructor(
    @InjectRepository(ShippingSetting)
    private readonly shippingSettingRepo: Repository<ShippingSetting>,
  ) {}

  async getSettings(): Promise<ShippingSetting> {
    let settings = await this.shippingSettingRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.shippingSettingRepo.create({
        id: 1,
        bulky_inner_fee: 150000,
        bulky_outer_fee: 350000,
        bulky_freeship_threshold: 20000000,
        standard_inner_fee: 30000,
        standard_outer_fee: 60000,
        standard_freeship_threshold: 5000000,
        inner_city_keywords: ['hồ chí minh', 'ho chi minh', 'hcm'],
        unsupported_keywords: ['phú quốc', 'côn đảo', 'trường sa', 'hoàng sa', 'huyện đảo'],
      });
      await this.shippingSettingRepo.save(settings);
    }
    return settings;
  }

  async updateSettings(dto: UpdateShippingSettingDto): Promise<ShippingSetting> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return await this.shippingSettingRepo.save(settings);
  }
}
