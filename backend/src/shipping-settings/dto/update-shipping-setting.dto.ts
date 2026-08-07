import { IsNumber, IsArray, IsOptional, Min } from 'class-validator';

export class UpdateShippingSettingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  bulky_inner_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bulky_outer_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bulky_freeship_threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  standard_inner_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  standard_outer_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  standard_freeship_threshold?: number;

  @IsOptional()
  @IsArray()
  inner_city_keywords?: string[];

  @IsOptional()
  @IsArray()
  unsupported_keywords?: string[];
}
