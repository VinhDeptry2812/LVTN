import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus, PaymentStatus } from '../order.entity';

export class UpdateOrderStatusDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;
}
