import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AddToCartDto } from './add-to-cart.dto';

export class SyncCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddToCartDto)
  items: AddToCartDto[];
}
