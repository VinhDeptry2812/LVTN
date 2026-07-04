import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCollectionDto {
  @ApiProperty({ description: 'Tên bộ sưu tập', example: 'COASTAL' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Slug (Đường dẫn thân thiện)', example: 'coastal' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'Mô tả bộ sưu tập', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Ảnh bìa bộ sưu tập', required: false })
  @IsString()
  @IsOptional()
  cover_image?: string;

  @ApiProperty({ description: 'Trạng thái hiển thị', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({ description: 'Danh sách ID sản phẩm thuộc bộ sưu tập', required: false, type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  product_ids?: number[];
}
