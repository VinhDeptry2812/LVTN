import { Module, forwardRef } from '@nestjs/common';
import { VnpayService } from './vnpay.service';
import { VnpayController } from './vnpay.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [VnpayService],
  controllers: [VnpayController],
  exports: [VnpayService],
})
export class VnpayModule {}
