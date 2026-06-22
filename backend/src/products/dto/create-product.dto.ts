import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Sofa da cao cấp', description: 'Tên sản phẩm' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'sofa-da-cao-cap', description: 'Đường dẫn chuẩn SEO' })
  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'Mô tả chi tiết sản phẩm...', description: 'Mô tả sản phẩm' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 5000000, description: 'Giá bán cơ bản' })
  @IsNotEmpty({ message: 'Giá bán không được để trống' })
  @IsNumber({}, { message: 'Giá bán phải là số' })
  base_price: number;

  @ApiProperty({ example: 1, description: 'ID của danh mục cha' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsNumber()
  category_id: number;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái mở bán' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
