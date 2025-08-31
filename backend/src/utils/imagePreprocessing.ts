import sharp from 'sharp';

interface PreprocessingOptions {
  enhance?: boolean;
  rotate?: boolean;
  crop?: boolean;
  targetDpi?: number;
}

/**
 * Preprocess image for better OCR results
 * Especially important for mobile photos which may have:
 * - Glare/reflections
 * - Poor lighting
 * - Rotation issues
 * - Low resolution
 */
export async function preprocessBoardingPassImage(
  buffer: Buffer,
  mimeType: string,
  options: PreprocessingOptions = {}
): Promise<Buffer> {
  const {
    enhance = true,
    rotate = true,
    crop = false,
    targetDpi = 300
  } = options;

  try {
    let image = sharp(buffer);
    
    // Get image metadata
    const metadata = await image.metadata();
    console.log('Original image metadata:', {
      width: metadata.width,
      height: metadata.height,
      density: metadata.density,
      format: metadata.format
    });

    // Auto-rotate based on EXIF orientation
    if (rotate) {
      image = image.rotate();
    }

    // Resize if image is too small or too large
    if (metadata.width && metadata.height) {
      const maxWidth = 2400;
      const minWidth = 800;
      
      if (metadata.width > maxWidth) {
        image = image.resize(maxWidth, null, {
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: true
        });
      } else if (metadata.width < minWidth) {
        // Upscale small images for better OCR
        const scale = minWidth / metadata.width;
        image = image.resize(
          Math.round(metadata.width * scale),
          Math.round(metadata.height * scale),
          {
            kernel: sharp.kernel.cubic
          }
        );
      }
    }

    // Apply image enhancements
    if (enhance) {
      image = image
        // Convert to grayscale for better OCR
        .grayscale()
        // Increase contrast to make text stand out
        .linear(1.5, -(128 * 0.5) + 128)
        // Sharpen to improve text clarity
        .sharpen()
        // Normalize to improve contrast
        .normalize()
        // Apply median filter to reduce noise
        .median(3);
    }

    // Skip threshold for now - it's too aggressive for some images
    // Only apply threshold if the image has very low contrast
    if (metadata.density && metadata.density < 150) {
      // Apply threshold only for low quality images
      image = image.threshold(140, { grayscale: true });
    }

    // Set DPI for better OCR results
    image = image.withMetadata({
      density: targetDpi
    });

    // Convert to PNG for lossless quality
    const processedBuffer = await image
      .png({
        quality: 100,
        compressionLevel: 9
      })
      .toBuffer();

    const newMetadata = await sharp(processedBuffer).metadata();
    console.log('Processed image metadata:', {
      width: newMetadata.width,
      height: newMetadata.height,
      density: newMetadata.density,
      format: newMetadata.format,
      size: processedBuffer.length
    });

    return processedBuffer;
  } catch (error) {
    console.error('Image preprocessing failed:', error);
    // Return original buffer if preprocessing fails
    return buffer;
  }
}

/**
 * Detect if image might be a mobile photo based on metadata
 */
export async function isMobilePhoto(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    
    // Check for mobile-specific EXIF data
    if (metadata.exif) {
      // Mobile photos often have specific make/model in EXIF
      const exifBuffer = metadata.exif;
      const exifString = exifBuffer.toString();
      
      const mobileKeywords = [
        'iPhone', 'iPad', 'Samsung', 'Google', 'Pixel', 
        'OnePlus', 'Xiaomi', 'Huawei', 'LG', 'Sony',
        'Mobile', 'Phone', 'Android'
      ];
      
      if (mobileKeywords.some(keyword => exifString.includes(keyword))) {
        return true;
      }
    }
    
    // Check aspect ratio - mobile photos tend to be portrait or specific ratios
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      const commonMobileRatios = [0.75, 0.5625, 1.7778, 0.5625]; // 3:4, 9:16, 16:9, 9:16
      
      if (commonMobileRatios.some(ratio => Math.abs(aspectRatio - ratio) < 0.05)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if mobile photo:', error);
    return false;
  }
}

/**
 * Extract boarding pass region from full image
 * Useful when boarding pass is part of a larger photo
 */
export async function extractBoardingPassRegion(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return buffer;
    }
    
    // Convert to grayscale for edge detection
    const grayscale = await image
      .grayscale()
      .raw()
      .toBuffer();
    
    // Simple edge detection to find document boundaries
    // This is a simplified approach - in production you'd use more sophisticated methods
    const { data, info } = await sharp(buffer)
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Find the bounding box of the boarding pass
    // This is a placeholder - actual implementation would analyze edges
    // For now, we'll just crop to center 80% to remove borders
    const cropWidth = Math.floor(metadata.width * 0.8);
    const cropHeight = Math.floor(metadata.height * 0.8);
    const left = Math.floor((metadata.width - cropWidth) / 2);
    const top = Math.floor((metadata.height - cropHeight) / 2);
    
    return sharp(buffer)
      .extract({
        left,
        top,
        width: cropWidth,
        height: cropHeight
      })
      .toBuffer();
  } catch (error) {
    console.error('Error extracting boarding pass region:', error);
    return buffer;
  }
}

/**
 * Apply adaptive preprocessing based on image analysis
 */
export async function adaptivePreprocess(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const metadata = await image.metadata();
    
    // Calculate image statistics
    const pixels = data.length / info.channels;
    let sum = 0;
    let min = 255;
    let max = 0;
    
    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += info.channels * 10) {
      const value = data[i];
      sum += value;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    
    const avg = sum / (pixels / 10);
    const contrast = max - min;
    
    console.log('Image analysis:', { avg, min, max, contrast });
    
    // Determine preprocessing strategy
    let processedImage = sharp(buffer);
    
    // If image is too dark
    if (avg < 100) {
      console.log('Image is dark, applying brightness correction');
      processedImage = processedImage.modulate({
        brightness: 1.5
      });
    }
    
    // If image has low contrast
    if (contrast < 100) {
      console.log('Low contrast detected, applying enhancement');
      processedImage = processedImage
        .normalize()
        .linear(1.5, -(128 * 0.5) + 128);
    }
    
    // Always convert to grayscale and sharpen for OCR
    processedImage = processedImage
      .grayscale()
      .sharpen();
    
    // Only apply threshold if really needed (very low contrast)
    if (contrast < 50) {
      processedImage = processedImage.threshold(150);
    }
    
    return processedImage.toBuffer();
  } catch (error) {
    console.error('Adaptive preprocessing failed:', error);
    return buffer;
  }
}