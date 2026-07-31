import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';
import { OrderStatus } from '../order.entity';

export class HandleReturnDto {
  @IsNotEmpty()
  @IsEnum([OrderStatus.RETURN_APPROVED, OrderStatus.RETURN_REJECTED])
  status: OrderStatus;

  @IsOptional()
  @IsString()
  rejectReason?: string;

  @IsOptional()
  @IsBoolean()
  shouldRestock?: boolean;

  @IsOptional()
  @IsString()
  @IsEnum(['refund', 'exchange'])
  actionType?: 'refund' | 'exchange';
}
