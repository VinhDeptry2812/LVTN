import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  Min,
} from 'class-validator';
import { DiscountType } from '../../vouchers/voucher.entity';
import { PromotionApplyType } from '../promotion.entity';

export class CreatePromotionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(DiscountType)
  discount_type: DiscountType;

  @IsEnum(PromotionApplyType)
  apply_type: PromotionApplyType;

  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  category_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  product_ids?: number[];
}
