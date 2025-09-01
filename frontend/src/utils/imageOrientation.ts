/**
 * Utility to fix EXIF orientation issues in uploaded images
 * This prevents images from being rotated incorrectly when uploaded from mobile devices
 */

export const getImageOrientation = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const dataView = new DataView(arrayBuffer);
      
      // Check if it's a JPEG with EXIF data
      if (dataView.getUint16(0, false) !== 0xFFD8) {
        resolve(1); // Not a JPEG, assume normal orientation
        return;
      }
      
      let offset = 2;
      let marker = dataView.getUint16(offset, false);
      
      while (marker !== 0xFFE1 && offset < dataView.byteLength - 2) {
        offset += 2 + dataView.getUint16(offset + 2, false);
        marker = dataView.getUint16(offset, false);
      }
      
      if (marker !== 0xFFE1) {
        resolve(1); // No EXIF data found
        return;
      }
      
      offset += 4;
      if (dataView.getUint32(offset, false) !== 0x45786966) {
        resolve(1); // Not EXIF data
        return;
      }
      
      offset += 6;
      const little = dataView.getUint16(offset, false) === 0x4949;
      offset += dataView.getUint32(offset + 4, little);
      const tags = dataView.getUint16(offset, little);
      offset += 2;
      
      for (let i = 0; i < tags; i++) {
        const tag = dataView.getUint16(offset + i * 12, little);
        if (tag === 0x0112) { // Orientation tag
          const orientation = dataView.getUint16(offset + i * 12 + 8, little);
          resolve(orientation);
          return;
        }
      }
      
      resolve(1); // Default orientation
    };
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024)); // Read first 64KB only
  });
};

export const correctImageOrientation = (
  file: File,
  maxWidth = 1080,  // Reduced max size for safety
  maxHeight = 1080,
  quality = 0.8     // Reduced quality to save memory
): Promise<{ file: File; url: string }> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = async () => {
      try {
        const orientation = await getImageOrientation(file);
        
        // If orientation is normal (1), just return the original file with basic compression
        if (orientation === 1) {
          let { width, height } = img;
          
          // Only resize if image is too large
          if (width <= maxWidth && height <= maxHeight) {
            // Image is already correct orientation and size, return original
            const url = URL.createObjectURL(file);
            resolve({ file, url });
            return;
          }
          
          // Apply basic resizing only
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
        } else {
          // Apply EXIF orientation correction using a simpler, more reliable method
          let { width, height } = img;
          
          // Calculate new dimensions to fit within max constraints
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          // Use a simpler approach based on the EXIF orientation
          switch (orientation) {
            case 2: // Flip horizontal
              canvas.width = width;
              canvas.height = height;
              ctx.translate(width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(img, 0, 0, width, height);
              break;
              
            case 3: // Rotate 180°
              canvas.width = width;
              canvas.height = height;
              ctx.translate(width, height);
              ctx.rotate(Math.PI);
              ctx.drawImage(img, 0, 0, width, height);
              break;
              
            case 4: // Flip vertical
              canvas.width = width;
              canvas.height = height;
              ctx.translate(0, height);
              ctx.scale(1, -1);
              ctx.drawImage(img, 0, 0, width, height);
              break;
              
            case 5: // Rotate 90° CCW + flip horizontal
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(-Math.PI / 2);
              ctx.scale(-1, 1);
              ctx.translate(-height, -width);
              ctx.drawImage(img, 0, 0, width, height);
              break;
              
            case 6: // Rotate 90° CW - need to rotate 90° CCW to fix
              canvas.width = height;  // Swap dimensions
              canvas.height = width;
              ctx.rotate(-Math.PI / 2);  // Rotate 90° counter-clockwise to counteract
              ctx.translate(-height, 0);
              ctx.drawImage(img, 0, 0, width, height);
              break;
              
            case 7: // Rotate 90° CW + flip horizontal
              canvas.width = height;
              canvas.height = width;
              ctx.rotate(Math.PI / 2);
              ctx.scale(-1, 1);
              ctx.translate(-height, -width);
              ctx.drawImage(img, 0, 0, width, height);
              break;
              
            case 8: // Rotate 90° CCW - need to rotate 90° CW to fix
              canvas.width = height;  // Swap dimensions  
              canvas.height = width;
              ctx.rotate(-Math.PI / 2);  // Rotate 90° counter-clockwise to counteract
              ctx.translate(-height, 0);
              ctx.drawImage(img, 0, 0, width, height);
              break;
              
            default: // Orientation 1 or unknown
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
          }
        }
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              return;
            }
            
            // Create a new file with corrected orientation
            const correctedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            
            // Create preview URL
            const url = URL.createObjectURL(blob);
            
            resolve({ file: correctedFile, url });
          },
          file.type,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};