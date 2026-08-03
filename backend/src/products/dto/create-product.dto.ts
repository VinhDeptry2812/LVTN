import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDetailDto {
  @ApiPropertyOptional({
    description: 'Thông số kỹ thuật dạng key-value',
    example: {
      'Kích thước': '220 x 90 x 85 cm',
      'Chất liệu': 'Da bò thật',
      'Cân nặng': '45 kg',
      'Bảo hành': '24 tháng',
    },
  })
  @IsOptional()
  specifications?: any;
}

export class CreateProductVariantDto {
  @ApiPropertyOptional({
    description: 'ID của biến thể (chỉ dùng khi cập nhật)',
  })
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Thuộc tính biến thể dạng key-value',
    example: { 'Màu sắc': 'Đen', 'Kích thước': 'L' },
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiPropertyOptional({ description: 'Giá nhập của biến thể' })
  @IsOptional()
  @IsNumber()
  import_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price_adjustment?: number;

  @ApiPropertyOptional({ description: 'Hình ảnh đại diện của biến thể' })
  @IsOptional()
  @IsString()
  image_url?: string;
}

export class CreateProductImageDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  image_url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_hover?: boolean;

  @ApiPropertyOptional({
    description: 'Chỉ mục của biến thể trong mảng variants (khi tạo mới)',
  })
  @IsOptional()
  @IsNumber()
  variant_index?: number;

  @ApiPropertyOptional({ description: 'ID của biến thể (khi cập nhật)' })
  @IsOptional()
  @IsNumber()
  variant_id?: number;
}

export class CreateProductDto {
  @ApiPropertyOptional({ example: 'SP001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 'Sofa da cao cấp', description: 'Tên sản phẩm' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'sofa-da-cao-cap',
    description: 'Đường dẫn chuẩn SEO',
  })
  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({
    example: 'Mô tả chi tiết sản phẩm...',
    description: 'Mô tả sản phẩm',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 5000000, description: 'Giá bán cơ bản' })
  @IsNotEmpty({ message: 'Giá bán không được để trống' })
  @IsNumber({}, { message: 'Giá bán phải là số' })
  base_price: number;

  @ApiPropertyOptional({ example: 4000000, description: 'Giá khuyến mãi' })
  @IsOptional()
  @IsNumber({}, { message: 'Giá khuyến mãi phải là số' })
  discount_price?: number;

  @ApiProperty({ example: 1, description: 'ID của danh mục cha' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  @IsNumber()
  category_id: number;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái mở bán' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Sản phẩm cồng kềnh' })
  @IsOptional()
  @IsBoolean()
  is_bulky?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Danh sách ID bộ sưu tập',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  collection_ids?: number[];

  @ApiPropertyOptional({ type: () => CreateProductDetailDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProductDetailDto)
  detail?: CreateProductDetailDto;

  @ApiPropertyOptional({ type: () => [CreateProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiPropertyOptional({ type: () => [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
}
