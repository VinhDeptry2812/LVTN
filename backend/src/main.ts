import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bật CORS để Frontend (port 5173) có thể gọi API
  app.enableCors();

  // Bật ValidationPipe để tự động kiểm tra dữ liệu đầu vào theo DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Web Nội thất API')
    .setDescription('Tài liệu API cho dự án E-commerce đồ nội thất tích hợp AI')
    .setVersion('1.0')
    .addBearerAuth() // Kích hoạt nút điền JWT Token trên UI
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Đường dẫn truy cập Swagger UI

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
