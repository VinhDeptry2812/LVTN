import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { DiscountType } from '../voucher.entity';

export class CreateVoucherDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsEnum(DiscountType)
  discount_type: DiscountType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_value?: number;

  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
