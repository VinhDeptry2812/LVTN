import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUrl,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Sofa Phòng Khách', description: 'Tên danh mục' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'sofa-phong-khach',
    description: 'Đường dẫn chuẩn SEO',
  })
  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({
    example: 'https://example.com/sofa.jpg',
    description: 'Ảnh đại diện',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn ảnh không hợp lệ' })
  image_url?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID của danh mục cha (nếu có)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'ID danh mục cha phải là số' })
  parentId?: number;
}
