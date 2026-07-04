import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async generateProductDescription(name: string, category: string, attributes: string): Promise<string> {
    if (!this.ai) {
      throw new InternalServerErrorException('Gemini API chưa được cấu hình.');
    }

    try {
      const prompt = `Bạn là một chuyên gia viết content marketing cho cửa hàng nội thất cao cấp FurniShop.
Hãy viết một bài mô tả sản phẩm (product description) thật hấp dẫn, chuyên nghiệp và chuẩn SEO dựa trên các thông tin sau:
- Tên sản phẩm: ${name}
- Danh mục: ${category}
- Đặc điểm/Chất liệu/Kích thước: ${attributes}

Yêu cầu định dạng:
1. Độ dài khoảng 150 - 250 chữ.
2. Viết bằng tiếng Việt, giọng văn sang trọng, tinh tế và thuyết phục.
3. Chia thành các đoạn văn ngắn rõ ràng. KHÔNG sử dụng Markdown (tuyệt đối không dùng dấu * hoặc **). Chỉ dùng văn bản thuần túy (plain text) hoặc dấu gạch ngang (-) cho danh sách.
4. KHÔNG bao gồm các câu mở đầu dư thừa như "Dưới đây là mô tả...", chỉ trả về nội dung bài viết.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || 'Không thể tạo mô tả cho sản phẩm này.';
    } catch (error) {
      console.error('Lỗi Gemini API:', error);
      throw new InternalServerErrorException('Không thể tạo mô tả tự động lúc này.');
    }
  }
}
