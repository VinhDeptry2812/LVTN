import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { PostStatus } from '../post.entity';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề bài viết không được để trống' })
  title: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsNotEmpty({ message: 'Nội dung bài viết không được để trống' })
  content: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @IsBoolean()
  @IsOptional()
  is_featured?: boolean;

  @IsString()
  @IsOptional()
  author_name?: string;
}
