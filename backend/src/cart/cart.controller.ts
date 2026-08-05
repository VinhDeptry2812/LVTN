import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { SyncCartDto } from './dto/sync-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@GetUser('id') userId: number) {
    return this.cartService.getCart(userId);
  }

  @Post('sync')
  async syncCart(
    @GetUser('id') userId: number,
    @Body() syncCartDto: SyncCartDto,
  ) {
    return this.cartService.syncCart(userId, syncCartDto);
  }

  @Post('items')
  async addToCart(
    @GetUser('id') userId: number,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Patch('items/:id')
  async updateCartItem(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(userId, itemId, updateCartItemDto);
  }

  @Delete('items/:id')
  async removeCartItem(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeCartItem(userId, itemId);
  }

  @Delete()
  async clearCart(@GetUser('id') userId: number) {
    return this.cartService.clearCart(userId);
  }
}
