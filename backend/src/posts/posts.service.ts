import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Post, PostStatus } from './post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  private async makeUniqueSlug(title: string, currentId?: number): Promise<string> {
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = 'bai-viet';
    let slug = baseSlug;
    let count = 1;

    while (true) {
      const existing = await this.postRepository.findOne({ where: { slug } });
      if (!existing || (currentId && existing.id === currentId)) {
        break;
      }
      slug = `${baseSlug}-${count}`;
      count++;
    }
    return slug;
  }

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const slug = createPostDto.slug
      ? await this.makeUniqueSlug(createPostDto.slug)
      : await this.makeUniqueSlug(createPostDto.title);

    const post = this.postRepository.create({
      ...createPostDto,
      slug,
      author_name: createPostDto.author_name || 'Ban biên tập FurniShop',
    });

    return await this.postRepository.save(post);
  }

  async findAllAdmin(query: {
    search?: string;
    category?: string;
    status?: PostStatus;
    page?: number;
    limit?: number;
  }) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Post>[] = [];

    const baseWhere: FindOptionsWhere<Post> = {};
    if (query.category) {
      baseWhere.category = query.category;
    }
    if (query.status) {
      baseWhere.status = query.status;
    }

    if (query.search) {
      where.push(
        { ...baseWhere, title: Like(`%${query.search}%`) },
        { ...baseWhere, summary: Like(`%${query.search}%`) },
      );
    } else {
      where.push(baseWhere);
    }

    const [items, total] = await this.postRepository.findAndCount({
      where: where.length ? where : undefined,
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublic(query: {
    search?: string;
    category?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 9;
    const skip = (page - 1) * limit;

    const baseWhere: FindOptionsWhere<Post> = {
      status: PostStatus.PUBLISHED,
    };

    if (query.category) {
      baseWhere.category = query.category;
    }
    if (query.featured !== undefined) {
      baseWhere.is_featured = query.featured;
    }

    const where: FindOptionsWhere<Post>[] = [];

    if (query.search) {
      where.push(
        { ...baseWhere, title: Like(`%${query.search}%`) },
        { ...baseWhere, summary: Like(`%${query.search}%`) },
      );
    } else {
      where.push(baseWhere);
    }

    const [items, total] = await this.postRepository.findAndCount({
      where,
      order: { is_featured: 'DESC', created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Không tìm thấy bài viết với ID: ${id}`);
    }
    return post;
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { slug } });
    if (!post) {
      throw new NotFoundException(`Không tìm thấy bài viết với đường dẫn: ${slug}`);
    }
    // Tăng lượt xem
    post.views += 1;
    await this.postRepository.save(post);
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);

    if (updatePostDto.title && updatePostDto.title !== post.title && !updatePostDto.slug) {
      post.slug = await this.makeUniqueSlug(updatePostDto.title, id);
    } else if (updatePostDto.slug && updatePostDto.slug !== post.slug) {
      post.slug = await this.makeUniqueSlug(updatePostDto.slug, id);
    }

    Object.assign(post, updatePostDto);
    return await this.postRepository.save(post);
  }

  async toggleFeatured(id: number): Promise<Post> {
    const post = await this.findOne(id);
    post.is_featured = !post.is_featured;
    return await this.postRepository.save(post);
  }

  async remove(id: number): Promise<{ message: string }> {
    const post = await this.findOne(id);
    await this.postRepository.remove(post);
    return { message: 'Đã xóa bài viết thành công' };
  }

  async getCategories(): Promise<string[]> {
    const posts = await this.postRepository
      .createQueryBuilder('post')
      .select('DISTINCT post.category', 'category')
      .where('post.status = :status', { status: PostStatus.PUBLISHED })
      .getRawMany();

    return posts.map((p) => p.category).filter(Boolean);
  }
}
