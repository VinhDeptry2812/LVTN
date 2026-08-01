import {
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryAuditDto {
  @ApiProperty({ example: [1, 2] })
  @IsNotEmpty()
  @IsArray()
  @IsNumber({}, { each: true })
  variant_ids: number[];

  @ApiProperty({ example: 'Kiểm kê định kỳ khu A tầng 1' })
  @IsOptional()
  @IsString()
  notes?: string;
}
