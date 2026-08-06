import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './product.entity';
import { ProductDetail } from './product-detail.entity';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';
import { InventoryTransaction } from './inventory-transaction.entity';
import { Promotion } from '../promotions/promotion.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductDetail,
      ProductVariant,
      ProductImage,
      InventoryTransaction,
      Promotion,
    ]),
    CloudinaryModule,
    NotificationsModule,
    AiModule,
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
