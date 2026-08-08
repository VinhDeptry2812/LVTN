import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderReturn } from './order-return.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderCancellationService } from './services/order-cancellation.service';
import { OrderInvoiceService } from './services/order-invoice.service';
import { OrderPaymentService } from './services/order-payment.service';
import { OrderReturnService } from './services/order-return.service';
import { ProductVariant } from '../products/product-variant.entity';
import { InventoryTransaction } from '../products/inventory-transaction.entity';
import { StockIssue } from '../stock-issues/stock-issue.entity';
import { StockIssueItem } from '../stock-issues/stock-issue-item.entity';
import { CartModule } from '../cart/cart.module';
import { VnpayModule } from '../vnpay/vnpay.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { WarrantiesModule } from '../warranties/warranties.module';
import { ShippingSettingsModule } from '../shipping-settings/shipping-settings.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      ProductVariant,
      OrderReturn,
      InventoryTransaction,
      StockIssue,
      StockIssueItem,
    ]),
    CartModule,
    forwardRef(() => VnpayModule),
    VouchersModule,
    NotificationsModule,
    WarrantiesModule,
    ShippingSettingsModule,
  ],
  providers: [
    OrdersService,
    OrderCancellationService,
    OrderInvoiceService,
    OrderPaymentService,
    OrderReturnService,
  ],
  controllers: [OrdersController],
  exports: [
    OrdersService,
    OrderCancellationService,
    OrderInvoiceService,
    OrderPaymentService,
    OrderReturnService,
  ],
})
export class OrdersModule {}
