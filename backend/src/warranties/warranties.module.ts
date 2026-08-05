import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warranty } from './warranty.entity';
import { WarrantyClaimLog } from './warranty-claim-log.entity';
import { Order } from '../orders/order.entity';
import { WarrantiesService } from './warranties.service';
import { WarrantiesController } from './warranties.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warranty, WarrantyClaimLog, Order]),
    NotificationsModule,
  ],
  controllers: [WarrantiesController],
  providers: [WarrantiesService],
  exports: [WarrantiesService],
})
export class WarrantiesModule {}

