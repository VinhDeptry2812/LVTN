import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: {
        items: {
          product: {
            images: true,
          },
          variant: true,
        },
      },
    });

    if (!cart) {
      cart = this.cartRepository.create({
        user: { id: userId },
        items: [],
      });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  async getCart(userId: number): Promise<Cart> {
    return this.getOrCreateCart(userId);
  }

  async addToCart(userId: number, dto: AddToCartDto): Promise<Cart> {
    const { product_id, product_variant_id, quantity } = dto;
    const cart = await this.getOrCreateCart(userId);

    // 1. Kiểm tra sản phẩm tồn tại
    const product = await this.productRepository.findOne({
      where: { id: product_id },
    });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    let variant: ProductVariant | null = null;
    let availableStock = 9999; // Giả định stock lớn nếu không quản lý stock sản phẩm chính

    // 2. Kiểm tra biến thể nếu được gửi lên
    if (product_variant_id) {
      variant = await this.variantRepository.findOne({
        where: { id: product_variant_id, product: { id: product_id } },
      });
      if (!variant) {
        throw new NotFoundException('Biến thể sản phẩm không tồn tại hoặc không thuộc sản phẩm này');
      }
      availableStock = variant.stock;
    }

    // 3. Tìm sản phẩm trong giỏ hàng hiện tại
    let cartItem = cart.items.find(
      (item) =>
        item.product.id === product_id &&
        (!variant ? !item.variant : item.variant?.id === variant.id),
    );

    const targetQuantity = cartItem ? cartItem.quantity + quantity : quantity;

    // 4. Kiểm tra hàng tồn kho
    if (targetQuantity > availableStock) {
      throw new BadRequestException(
        `Không đủ hàng tồn kho. Chỉ còn lại ${availableStock} sản phẩm.`,
      );
    }

    if (cartItem) {
      cartItem.quantity = targetQuantity;
    } else {
      cartItem = this.cartItemRepository.create({
        cart,
        product,
        variant: variant || undefined,
        quantity,
      });
      cart.items.push(cartItem);
    }

    await this.cartItemRepository.save(cartItem);
    return this.getCart(userId);
  }

  async updateCartItem(
    userId: number,
    itemId: number,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const { quantity } = dto;
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId, cart: { id: cart.id } },
      relations: {
        product: true,
        variant: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Không tìm thấy sản phẩm này trong giỏ hàng');
    }

    let availableStock = 9999;
    if (cartItem.variant) {
      const variant = await this.variantRepository.findOne({
        where: { id: cartItem.variant.id },
      });
      if (variant) {
        availableStock = variant.stock;
      }
    }

    if (quantity > availableStock) {
      throw new BadRequestException(
        `Không đủ hàng tồn kho. Chỉ còn lại ${availableStock} sản phẩm.`,
      );
    }

    cartItem.quantity = quantity;
    await this.cartItemRepository.save(cartItem);

    return this.getCart(userId);
  }

  async removeCartItem(userId: number, itemId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: itemId, cart: { id: cart.id } },
    });

    if (!cartItem) {
      throw new NotFoundException('Không tìm thấy sản phẩm này trong giỏ hàng');
    }

    await this.cartItemRepository.remove(cartItem);
    return this.getCart(userId);
  }

  async clearCart(userId: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    if (cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
      cart.items = [];
    }
    return cart;
  }
}
