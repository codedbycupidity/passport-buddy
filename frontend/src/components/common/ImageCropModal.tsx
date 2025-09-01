import React, { useState, useEffect, useRef } from 'react';
import { Crop, Check, X } from 'lucide-react';
import { cropImageToRatio, getCropPreview, PostRatio, CropArea } from '../../utils/imageCrop';

interface ImageCropModalProps {
  file: File;
  originalUrl: string;
  onCropComplete: (croppedFile: File, croppedUrl: string, aspectRatio?: '1:1' | '4:5') => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  file,
  originalUrl,
  onCropComplete,
  onCancel,
  isOpen
}) => {
  const [selectedRatio, setSelectedRatio] = useState<PostRatio>('1:1');
  const [previewData, setPreviewData] = useState<{
    cropArea: CropArea;
    originalSize: { width: number; height: number };
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [customCropArea, setCustomCropArea] = useState<CropArea | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen && file) {
      getCropPreview(file, selectedRatio).then(({ cropArea, originalSize }) => {
        setPreviewData({ cropArea, originalSize });
        setCustomCropArea(cropArea); // Initialize with calculated crop area
      });
    }
  }, [file, selectedRatio, isOpen]);

  // Handle mouse events for dragging crop area
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewData || !imageRef.current) return;
    
    setIsDragging(true);
    const rect = imageRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing) {
      handleResizeMove(e);
      return;
    }
    
    if (!isDragging || !previewData || !imageRef.current || !customCropArea) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Calculate movement delta
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    
    // Calculate scale factor between display image and original image
    const scaleX = previewData.originalSize.width / rect.width;
    const scaleY = previewData.originalSize.height / rect.height;
    
    // Apply movement to crop area (scaled to original image coordinates)
    const newCropArea = {
      ...customCropArea,
      x: Math.max(0, Math.min(
        previewData.originalSize.width - customCropArea.width,
        customCropArea.x + (deltaX * scaleX)
      )),
      y: Math.max(0, Math.min(
        previewData.originalSize.height - customCropArea.height,
        customCropArea.y + (deltaY * scaleY)
      ))
    };
    
    setCustomCropArea(newCropArea);
    setDragStart({ x: currentX, y: currentY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
  };

  // Handle resize corner mouse down
  const handleResizeMouseDown = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    if (!previewData || !imageRef.current) return;
    
    setIsResizing(true);
    setResizeCorner(corner);
    const rect = imageRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle resize logic
  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing || !previewData || !imageRef.current || !customCropArea || !resizeCorner) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Calculate scale factor between display image and original image
    const scaleX = previewData.originalSize.width / rect.width;
    const scaleY = previewData.originalSize.height / rect.height;
    
    // Apply movement scaled to original image coordinates
    const deltaX = (currentX - dragStart.x) * scaleX;
    const deltaY = (currentY - dragStart.y) * scaleY;
    
    let newCropArea = { ...customCropArea };
    
    // Calculate target aspect ratio
    const targetAspectRatio = selectedRatio === '1:1' ? 1 : 4/5;
    
    // Apply resize based on corner
    switch (resizeCorner) {
      case 'bottom-right':
        newCropArea.width = Math.max(50, customCropArea.width + deltaX);
        newCropArea.height = newCropArea.width / targetAspectRatio;
        break;
      case 'bottom-left':
        const newWidth = Math.max(50, customCropArea.width - deltaX);
        newCropArea.x = customCropArea.x + (customCropArea.width - newWidth);
        newCropArea.width = newWidth;
        newCropArea.height = newWidth / targetAspectRatio;
        break;
      case 'top-right':
        const newWidthTR = Math.max(50, customCropArea.width + deltaX);
        const newHeightTR = newWidthTR / targetAspectRatio;
        newCropArea.y = customCropArea.y + (customCropArea.height - newHeightTR);
        newCropArea.width = newWidthTR;
        newCropArea.height = newHeightTR;
        break;
      case 'top-left':
        const newWidthTL = Math.max(50, customCropArea.width - deltaX);
        const newHeightTL = newWidthTL / targetAspectRatio;
        newCropArea.x = customCropArea.x + (customCropArea.width - newWidthTL);
        newCropArea.y = customCropArea.y + (customCropArea.height - newHeightTL);
        newCropArea.width = newWidthTL;
        newCropArea.height = newHeightTL;
        break;
    }
    
    // Ensure crop area stays within image bounds
    newCropArea.x = Math.max(0, Math.min(previewData.originalSize.width - newCropArea.width, newCropArea.x));
    newCropArea.y = Math.max(0, Math.min(previewData.originalSize.height - newCropArea.height, newCropArea.y));
    newCropArea.width = Math.min(newCropArea.width, previewData.originalSize.width - newCropArea.x);
    newCropArea.height = Math.min(newCropArea.height, previewData.originalSize.height - newCropArea.y);
    
    setCustomCropArea(newCropArea);
    setDragStart({ x: currentX, y: currentY });
  };

  const handleCrop = async () => {
    if (!customCropArea) return;
    
    console.log('🔄 Starting crop with custom area:', {
      customCropArea,
      selectedRatio,
      originalImageSize: previewData?.originalSize
    });
    
    setIsProcessing(true);
    try {
      // Use custom crop area instead of automatic calculation
      const result = await cropImageToRatio(file, { 
        ratio: selectedRatio,
        customCropArea 
      });
      
      console.log('✅ Crop completed successfully:', {
        croppedFileName: result.file.name,
        croppedFileSize: result.file.size,
        croppedUrl: result.url
      });
      
      onCropComplete(result.file, result.url, selectedRatio);
    } catch (error) {
      console.error('❌ Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          width: '600px', // Fixed reasonable width
          maxWidth: '90vw', // Don't exceed viewport
          maxHeight: '85vh', // Ensure buttons are visible
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Crop size={20} color="var(--pb-medium-purple)" />
            <h3 style={{ margin: 0, color: 'var(--pb-dark-purple)' }}>Crop for Post</h3>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Ratio Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.75rem 0', color: '#666', fontSize: '0.9rem' }}>
            Choose aspect ratio for your post:
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setSelectedRatio('1:1')}
              style={{
                padding: '0.5rem 1rem',
                border: `2px solid ${selectedRatio === '1:1' ? 'var(--pb-medium-purple)' : '#ddd'}`,
                borderRadius: '8px',
                background: selectedRatio === '1:1' ? 'var(--pb-ultra-light)' : 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: selectedRatio === '1:1' ? 'var(--pb-dark-purple)' : '#666',
              }}
            >
              1:1 Square
            </button>
            <button
              onClick={() => setSelectedRatio('4:5')}
              style={{
                padding: '0.5rem 1rem',
                border: `2px solid ${selectedRatio === '4:5' ? 'var(--pb-medium-purple)' : '#ddd'}`,
                borderRadius: '8px',
                background: selectedRatio === '4:5' ? 'var(--pb-ultra-light)' : 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: selectedRatio === '4:5' ? 'var(--pb-dark-purple)' : '#666',
              }}
            >
              4:5 Portrait
            </button>
          </div>
        </div>

        {/* Image Preview */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            height: '400px', // Fixed height for consistency
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : isResizing ? 'default' : 'grab',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div style={{ position: 'relative' }}>
            <img
              ref={imageRef}
              src={originalUrl}
              alt="Crop preview"
              style={{
                maxWidth: '100%',
                maxHeight: '400px', // Match container height
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                userSelect: 'none',
              }}
            />
            
            {/* Interactive Crop overlay */}
            {previewData && customCropArea && imageRef.current && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: isDragging ? 'none' : 'auto',
                }}
              >
                {/* Darken areas outside crop - using clip-path to avoid overlay on crop area */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    clipPath: `polygon(
                      0% 0%, 
                      0% 100%, 
                      ${(customCropArea.x / previewData.originalSize.width) * 100}% 100%, 
                      ${(customCropArea.x / previewData.originalSize.width) * 100}% ${(customCropArea.y / previewData.originalSize.height) * 100}%, 
                      ${((customCropArea.x + customCropArea.width) / previewData.originalSize.width) * 100}% ${(customCropArea.y / previewData.originalSize.height) * 100}%, 
                      ${((customCropArea.x + customCropArea.width) / previewData.originalSize.width) * 100}% ${((customCropArea.y + customCropArea.height) / previewData.originalSize.height) * 100}%, 
                      ${(customCropArea.x / previewData.originalSize.width) * 100}% ${((customCropArea.y + customCropArea.height) / previewData.originalSize.height) * 100}%, 
                      ${(customCropArea.x / previewData.originalSize.width) * 100}% 100%, 
                      100% 100%, 
                      100% 0%
                    )`,
                  }}
                />
                
                {/* Interactive crop area */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${(customCropArea.x / previewData.originalSize.width) * 100}%`,
                    top: `${(customCropArea.y / previewData.originalSize.height) * 100}%`,
                    width: `${(customCropArea.width / previewData.originalSize.width) * 100}%`,
                    height: `${(customCropArea.height / previewData.originalSize.height) * 100}%`,
                    border: '2px solid white',
                    boxShadow: '0 0 0 2px var(--pb-medium-purple)',
                    cursor: isDragging ? 'grabbing' : 'move',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}
                  onMouseDown={handleMouseDown}
                >
                  {!isDragging && !isResizing && (
                    <div>Drag to move • Corners to resize</div>
                  )}
                  
                  {/* Resize handles on corners */}
                  {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => (
                    <div
                      key={corner}
                      style={{
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        backgroundColor: 'white',
                        border: '2px solid var(--pb-medium-purple)',
                        borderRadius: '50%',
                        cursor: corner.includes('right') 
                          ? (corner.includes('top') ? 'ne-resize' : 'se-resize')
                          : (corner.includes('top') ? 'nw-resize' : 'sw-resize'),
                        ...(corner === 'top-left' && { top: '-6px', left: '-6px' }),
                        ...(corner === 'top-right' && { top: '-6px', right: '-6px' }),
                        ...(corner === 'bottom-left' && { bottom: '-6px', left: '-6px' }),
                        ...(corner === 'bottom-right' && { bottom: '-6px', right: '-6px' }),
                      }}
                      onMouseDown={(e) => handleResizeMouseDown(e, corner)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: '#666',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            disabled={isProcessing}
            style={{
              padding: '0.75rem 1.5rem',
              border: '2px solid var(--pb-medium-purple)',
              borderRadius: '8px',
              background: 'var(--pb-medium-purple)',
              color: 'white',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              opacity: isProcessing ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Check size={16} />
            {isProcessing ? 'Cropping...' : 'Apply Crop'}
          </button>
        </div>
      </div>
    </div>
  );
};