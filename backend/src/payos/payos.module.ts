import { Module, forwardRef } from '@nestjs/common';
import { PayosService } from './payos.service';
import { PayosController } from './payos.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [PayosService],
  controllers: [PayosController],
  exports: [PayosService],
})
export class PayosModule {}
