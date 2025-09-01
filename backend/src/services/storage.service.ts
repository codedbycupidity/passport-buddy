import { safeStrictDateExtraction } from '../utils/dateStrict';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import sharp from 'sharp';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

export interface StorageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer?: Buffer;
  size: number;
  filename?: string;
  path?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimetype: string;
  variants?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    original: string;
  };
}

export interface UploadOptions {
  generateVariants?: boolean;
  folder?: string;
}

abstract class StorageService {
  abstract upload(file: StorageFile, options?: UploadOptions): Promise<UploadResult>;
  abstract delete(key: string): Promise<void>;
  abstract getUrl(key: string): string;

  // Image size presets for social media - preserve aspect ratio
  protected readonly IMAGE_WIDTHS = {
    thumbnail: 150,
    small: 300, 
    medium: 600,
    large: 1200,
  };
}

class LocalStorageService extends StorageService {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    super();
    this.uploadDir = path.resolve(env.UPLOAD_DIR);
    // Ensure HTTPS in production
    this.baseUrl = env.UPLOAD_URL;
    if (process.env.NODE_ENV === 'production' && this.baseUrl.startsWith('http://')) {
      this.baseUrl = this.baseUrl.replace('http://', 'https://');
    }
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await mkdirAsync(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async upload(file: StorageFile, options: UploadOptions = {}): Promise<UploadResult> {
    const { generateVariants = false, folder = '' } = options;
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const baseFilename = `${fileId}`;

    if (generateVariants && file.mimetype.startsWith('image/')) {
      // Generate multiple sizes for images
      const variants: any = {};

      // Debug: Get original image dimensions
      const originalImage = sharp(file.buffer!, { failOnError: false });
      const { width: originalWidth, height: originalHeight } = await originalImage.metadata();
      const originalRatio = originalWidth && originalHeight ? (originalWidth / originalHeight).toFixed(3) : 'unknown';
      
      console.log('🖼️ STORAGE: Processing image with original dimensions:', {
        originalWidth,
        originalHeight,
        originalRatio,
        fileSize: file.size
      });

      // Original
      const originalFilename = `${baseFilename}_original${ext}`;
      const originalPath = path.join(this.uploadDir, folder, originalFilename);
      await this.ensureDir(path.dirname(originalPath));
      await fs.promises.writeFile(originalPath, file.buffer!);
      variants.original = `${this.baseUrl}/${folder}/${originalFilename}`;

      // Generate variants - preserve aspect ratio
      for (const [sizeName, targetWidth] of Object.entries(this.IMAGE_WIDTHS)) {
        try {
          const resizedProcessor = sharp(file.buffer!, { failOnError: false })
            .rotate(0) // Disable auto-rotation - keep original orientation  
            .resize(targetWidth, null, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85, progressive: true });

          const resizedBuffer = await resizedProcessor.toBuffer();
          const { width: resizedWidth, height: resizedHeight } = await sharp(resizedBuffer).metadata();
          const resizedRatio = resizedWidth && resizedHeight ? (resizedWidth / resizedHeight).toFixed(3) : 'unknown';
          
          console.log(`🔄 STORAGE: Created ${sizeName} variant:`, {
            targetWidth,
            actualWidth: resizedWidth,
            actualHeight: resizedHeight,
            actualRatio: resizedRatio,
            preservedRatio: resizedRatio === originalRatio
          });

          const variantFilename = `${baseFilename}_${sizeName}.jpg`;
          const variantPath = path.join(this.uploadDir, folder, variantFilename);
          await fs.promises.writeFile(variantPath, resizedBuffer);
          variants[sizeName] = `${this.baseUrl}/${folder}/${variantFilename}`;
        } catch (error) {
          console.error(`Failed to create ${sizeName} variant:`, error);
        }
      }

      return {
        url: variants.medium || variants.original,
        key: baseFilename,
        size: file.size,
        mimetype: file.mimetype,
        variants,
      };
    } else {
      // Single file upload
      const filename = `${baseFilename}${ext}`;
      const filepath = path.join(this.uploadDir, folder, filename);
      await this.ensureDir(path.dirname(filepath));
      await fs.promises.writeFile(filepath, file.buffer!);

      return {
        url: `${this.baseUrl}/${folder}/${filename}`,
        key: filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    }
  }

  private async ensureDir(dir: string) {
    try {
      await mkdirAsync(dir, { recursive: true });
    } catch (error) {
      console.error('Failed to create directory:', error);
    }
  }

  async delete(key: string): Promise<void> {
    const filepath = path.join(this.uploadDir, key);
    try {
      await unlinkAsync(filepath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

class DigitalOceanSpacesService extends StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor() {
    super();

    if (!env.DO_SPACES_KEY || !env.DO_SPACES_SECRET || !env.DO_SPACES_BUCKET || !env.DO_SPACES_ENDPOINT) {
      throw new Error('DigitalOcean Spaces configuration is incomplete');
    }

    this.bucket = env.DO_SPACES_BUCKET;
    this.endpoint = `https://${env.DO_SPACES_ENDPOINT}`;

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: env.DO_SPACES_REGION || 'us-east-1',
      credentials: {
        accessKeyId: env.DO_SPACES_KEY,
        secretAccessKey: env.DO_SPACES_SECRET,
      },
    });
  }

  async upload(file: StorageFile, options: UploadOptions = {}): Promise<UploadResult> {
    const { generateVariants = false, folder = 'posts' } = options;
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const baseKey = `${folder}/${fileId}`;

    if (generateVariants && file.mimetype.startsWith('image/')) {
      // Generate multiple sizes for social media
      const variants: any = {};
      const uploadPromises = [];

      // Debug: Get original image dimensions
      const originalImage = sharp(file.buffer!, { failOnError: false });
      const { width: originalWidth, height: originalHeight } = await originalImage.metadata();
      const originalRatio = originalWidth && originalHeight ? (originalWidth / originalHeight).toFixed(3) : 'unknown';
      
      console.log('🌊 SPACES: Processing image with original dimensions:', {
        originalWidth,
        originalHeight,
        originalRatio,
        fileSize: file.size
      });

      // Upload original
      const originalKey = `${baseKey}_original${ext}`;
      uploadPromises.push(
        this.s3Client
          .send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: originalKey,
              Body: file.buffer,
              ContentType: file.mimetype,
              ACL: 'public-read',
              CacheControl: 'public, max-age=31536000',
              Metadata: {
                originalName: file.originalname,
              },
            })
          )
          .then(() => {
            variants.original = this.getUrl(originalKey);
          })
      );

      // Generate and upload variants - preserve aspect ratio
      for (const [sizeName, targetWidth] of Object.entries(this.IMAGE_WIDTHS)) {
        uploadPromises.push(
          sharp(file.buffer!, { failOnError: false })
            .rotate(0) // Disable auto-rotation - keep original orientation
            .resize(targetWidth, null, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85, progressive: true })
            .toBuffer()
            .then(async resizedBuffer => {
              const { width: resizedWidth, height: resizedHeight } = await sharp(resizedBuffer).metadata();
              const resizedRatio = resizedWidth && resizedHeight ? (resizedWidth / resizedHeight).toFixed(3) : 'unknown';
              
              console.log(`🔄 SPACES: Created ${sizeName} variant:`, {
                targetWidth,
                actualWidth: resizedWidth,
                actualHeight: resizedHeight,
                actualRatio: resizedRatio,
                preservedRatio: resizedRatio === originalRatio
              });
              
              return resizedBuffer;
            })
            .then(resizedBuffer => {
              const variantKey = `${baseKey}_${sizeName}.jpg`;
              return this.s3Client
                .send(
                  new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: variantKey,
                    Body: resizedBuffer,
                    ContentType: 'image/jpeg',
                    ACL: 'public-read',
                    CacheControl: 'public, max-age=31536000',
                  })
                )
                .then(() => {
                  variants[sizeName] = this.getUrl(variantKey);
                });
            })
            .catch(error => {
              console.error(`Failed to create ${sizeName} variant:`, error);
            })
        );
      }

      await Promise.all(uploadPromises);

      return {
        url: variants.medium || variants.original,
        key: baseKey,
        size: file.size,
        mimetype: file.mimetype,
        variants,
      };
    } else {
      // Single file upload (videos, documents, etc.)
      const key = `${baseKey}${ext}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
          CacheControl: file.mimetype.startsWith('video/') ? 'public, max-age=31536000' : undefined,
          Metadata: {
            originalName: file.originalname,
          },
        })
      );

      return {
        url: this.getUrl(key),
        key,
        size: file.size,
        mimetype: file.mimetype,
      };
    }
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Failed to delete file from Spaces:', error);
    }
  }

  getUrl(key: string): string {
    // Use CDN URL for better performance
    const region = env.DO_SPACES_REGION || 'nyc3';
    // Always use HTTPS for CDN URLs
    return `https://${this.bucket}.${region}.cdn.digitaloceanspaces.com/${key}`;
  }
}

// Factory function to create the appropriate storage service
export function createStorageService(): StorageService {
  if (env.STORAGE_TYPE === 'spaces') {
    return new DigitalOceanSpacesService();
  }
  return new LocalStorageService();
}

// Export a singleton instance
export const storageService = createStorageService();
