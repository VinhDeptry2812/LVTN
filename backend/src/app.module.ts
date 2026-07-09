import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AiModule } from './ai/ai.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { VnpayModule } from './vnpay/vnpay.module';
import { MomoModule } from './momo/momo.module';
import { CollectionsModule } from './collections/collections.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'postgres',
      password: 'password123',
      database: 'furnishop',
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CloudinaryModule,
    AiModule,
    CartModule,
    OrdersModule,
    VnpayModule,
    MomoModule,
    CollectionsModule,
    VouchersModule,
    AddressesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
