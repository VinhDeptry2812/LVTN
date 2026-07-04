import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty()
  @IsNumber()
  product_id: number;

  @IsOptional()
  @IsNumber()
  product_variant_id?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}
