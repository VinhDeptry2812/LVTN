import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '../purchase-order.entity';

export class UpdatePurchaseOrderStatusDto {
  @ApiProperty({
    example: PurchaseOrderStatus.COMPLETED,
    enum: [PurchaseOrderStatus.COMPLETED, PurchaseOrderStatus.CANCELLED],
  })
  @IsNotEmpty()
  @IsEnum([PurchaseOrderStatus.COMPLETED, PurchaseOrderStatus.CANCELLED], {
    message: 'Trạng thái không hợp lệ. Chỉ chấp nhận completed hoặc cancelled',
  })
  status: PurchaseOrderStatus;
}
