import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductVariant } from '../products/product-variant.entity';
import { CartModule } from '../cart/cart.module';
import { VnpayModule } from '../vnpay/vnpay.module';
import { MomoModule } from '../momo/momo.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, ProductVariant]),
    CartModule,
    forwardRef(() => VnpayModule),
    forwardRef(() => MomoModule),
    VouchersModule,
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
