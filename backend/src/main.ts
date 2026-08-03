import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Cấu hình CORS an toàn từ môi trường
  const originsStr = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:5173,http://localhost:5174,http://localhost:3000',
  );
  const allowedOrigins = originsStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });

  // Bật ValidationPipe tự động ép kiểu dữ liệu DTO/Query Parameters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      //Tự động loại bỏ tất cả các thuộc tính rác hoặc nhạy cảm mà người
      //dùng đính kèm vào Body Request nhưng không được khai báo trong DTO
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      //Tự động ép kiểu dữ liệu từ chuỗi (String) trên Query Parameter
      //thành đúng kiểu mong muốn (như number, boolean) mà không cần ép kiểu thủ công.
    }),
  );

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Web Nội thất API')
    .setDescription('Tài liệu API cho dự án E-commerce đồ nội thất tích hợp AI')
    .setVersion('1.0')
    .addBearerAuth() // Kích hoạt nút điền JWT Token trên UI
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Đường dẫn truy cập Swagger UI

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();

