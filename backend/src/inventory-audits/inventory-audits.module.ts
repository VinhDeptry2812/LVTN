import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryAudit } from './inventory-audit.entity';
import { InventoryAuditItem } from './inventory-audit-item.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { InventoryTransaction } from '../products/inventory-transaction.entity';
import { InventoryAuditsService } from './inventory-audits.service';
import { InventoryAuditsController } from './inventory-audits.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryAudit,
      InventoryAuditItem,
      ProductVariant,
      InventoryTransaction,
    ]),
    NotificationsModule,
  ],
  controllers: [InventoryAuditsController],
  providers: [InventoryAuditsService],
  exports: [InventoryAuditsService],
})
export class InventoryAuditsModule {}
