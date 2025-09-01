/**
 * Image cropping utility for social media post ratios
 * Supports 1:1 (square) and 4:5 (portrait) aspect ratios
 */

export type PostRatio = '1:1' | '4:5';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  ratio: PostRatio;
  quality?: number;
  maxWidth?: number;
  customCropArea?: CropArea;
}

/**
 * Calculate the optimal crop area for a given aspect ratio
 */
export const calculateCropArea = (
  imageWidth: number,
  imageHeight: number,
  ratio: PostRatio
): CropArea => {
  let targetWidth: number, targetHeight: number;
  
  // Define target aspect ratios
  const aspectRatio = ratio === '1:1' ? 1 : 4/5; // 1:1 or 0.8 (4:5)
  
  const imageAspectRatio = imageWidth / imageHeight;
  
  if (imageAspectRatio > aspectRatio) {
    // Image is wider than target ratio, crop sides
    targetHeight = imageHeight;
    targetWidth = targetHeight * aspectRatio;
  } else {
    // Image is taller than target ratio, crop top/bottom
    targetWidth = imageWidth;
    targetHeight = targetWidth / aspectRatio;
  }
  
  // Center the crop area
  const x = (imageWidth - targetWidth) / 2;
  const y = (imageHeight - targetHeight) / 2;
  
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.min(targetWidth, imageWidth),
    height: Math.min(targetHeight, imageHeight)
  };
};

/**
 * Crop an image to a specific post ratio
 */
export const cropImageToRatio = (
  file: File,
  options: CropOptions
): Promise<{ file: File; url: string; cropArea: CropArea }> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      const { width: imgWidth, height: imgHeight } = img;
      // Use custom crop area if provided, otherwise calculate optimal crop area
      const cropArea = options.customCropArea || calculateCropArea(imgWidth, imgHeight, options.ratio);
      
      console.log('🎯 Image crop processing:', {
        imageSize: { width: imgWidth, height: imgHeight },
        usingCustomCrop: !!options.customCropArea,
        cropArea,
        targetRatio: options.ratio
      });
      
      // Calculate final dimensions (with max width constraint)
      const maxWidth = options.maxWidth || 1080;
      let finalWidth = cropArea.width;
      let finalHeight = cropArea.height;
      
      if (finalWidth > maxWidth) {
        const scale = maxWidth / finalWidth;
        finalWidth = maxWidth;
        finalHeight = finalHeight * scale;
      }
      
      // Set canvas size to final dimensions
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      
      // Draw the cropped image
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height, // Source rectangle
        0, 0, finalWidth, finalHeight // Destination rectangle
      );
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create cropped image'));
            return;
          }
          
          const croppedFile = new File([blob], `cropped_${file.name}`, {
            type: file.type,
            lastModified: Date.now(),
          });
          
          const url = URL.createObjectURL(blob);
          
          resolve({ file: croppedFile, url, cropArea });
        },
        file.type,
        options.quality || 0.9
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Get preview of crop area without actually cropping
 */
export const getCropPreview = (
  file: File,
  ratio: PostRatio
): Promise<{ previewUrl: string; cropArea: CropArea; originalSize: { width: number; height: number } }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = img;
      const cropArea = calculateCropArea(width, height, ratio);
      const previewUrl = URL.createObjectURL(file);
      
      resolve({
        previewUrl,
        cropArea,
        originalSize: { width, height }
      });
    };
    
    img.onerror = () => reject(new Error('Failed to load image for preview'));
    img.src = URL.createObjectURL(file);
  });
};