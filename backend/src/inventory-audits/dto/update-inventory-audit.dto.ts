import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { InventoryAuditStatus } from '../inventory-audit.entity';

export class UpdateAuditItemDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  variant_id: number;

  @ApiProperty({ example: 48 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  actual_quantity: number;
}

export class UpdateInventoryAuditDto {
  @ApiProperty({ type: [UpdateAuditItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAuditItemDto)
  items?: UpdateAuditItemDto[];

  @ApiProperty({ example: 'Đã hoàn tất kiểm tra kho thực tế' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: InventoryAuditStatus.COMPLETED,
    enum: [InventoryAuditStatus.COMPLETED, InventoryAuditStatus.CANCELLED],
    required: false,
  })
  @IsOptional()
  @IsEnum([InventoryAuditStatus.COMPLETED, InventoryAuditStatus.CANCELLED])
  status?: InventoryAuditStatus;
}
