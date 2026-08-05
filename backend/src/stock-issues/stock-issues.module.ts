import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockIssuesService } from './stock-issues.service';
import { StockIssuesController } from './stock-issues.controller';
import { StockIssue } from './stock-issue.entity';
import { StockIssueItem } from './stock-issue-item.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { InventoryTransaction } from '../products/inventory-transaction.entity';
import { Order } from '../orders/order.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockIssue,
      StockIssueItem,
      ProductVariant,
      InventoryTransaction,
      Order,
    ]),
    NotificationsModule,
  ],
  controllers: [StockIssuesController],
  providers: [StockIssuesService],
  exports: [StockIssuesService],
})
export class StockIssuesModule {}
