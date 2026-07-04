import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  uploadImage(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'furnishop_products',
          timeout: 120000 // Tăng timeout lên 120s (2 phút) để tránh lỗi 499 Request Timeout
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Unknown upload error'));
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteImageByUrl(url: string): Promise<void> {
    if (!url || !url.includes('cloudinary.com')) return;
    
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return;
      
      const pathPart = parts[1];
      const versionRegex = /^v\d+\//;
      const pathWithoutVersion = pathPart.replace(versionRegex, '');
      
      const lastDotIndex = pathWithoutVersion.lastIndexOf('.');
      const publicId = lastDotIndex === -1 ? pathWithoutVersion : pathWithoutVersion.substring(0, lastDotIndex);
      
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted image from Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete image from Cloudinary: ${url}`, error);
    }
  }
}
