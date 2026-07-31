import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockIssueReason } from '../stock-issue.entity';

export class CreateStockIssueItemDto {
  @IsInt()
  variant_id: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStockIssueDto {
  @IsEnum(StockIssueReason)
  reason: StockIssueReason;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockIssueItemDto)
  items: CreateStockIssueItemDto[];
}
