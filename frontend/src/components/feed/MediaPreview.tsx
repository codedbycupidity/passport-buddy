import React from 'react';
import { Crop, X } from 'lucide-react';

interface MediaPreviewProps {
  previewUrl: string | null;
  selectedImage: File | null;
  selectedVideo: File | null;
  onRemoveMedia: () => void;
  onCropImage?: () => void;
  isLoading?: boolean;
  aspectRatio?: '1:1' | '4:5';
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  previewUrl,
  selectedImage,
  selectedVideo,
  onRemoveMedia,
  onCropImage,
  isLoading = false,
  aspectRatio = '1:1',
}) => {
  console.log('🖼️ MediaPreview props:', {
    hasPreviewUrl: !!previewUrl,
    hasSelectedImage: !!selectedImage,
    hasSelectedVideo: !!selectedVideo,
    hasOnCropImage: !!onCropImage,
    isLoading,
    aspectRatio
  });
  
  if (!previewUrl) return null;

  return (
    <div style={{ position: 'relative', marginTop: '1rem' }}>
      {selectedImage && (
        <img
          src={previewUrl}
          alt='Preview'
          style={{
            width: '100%',
            maxWidth: '400px', // Max size constraint
            borderRadius: '0.5rem',
            objectFit: 'cover', // Fill the container (crop if needed)
            aspectRatio: aspectRatio === '4:5' ? '4 / 5' : '1 / 1', // Use dynamic aspect ratio
            height: 'auto',
          }}
        />
      )}
      {selectedVideo && (
        <video
          src={previewUrl}
          controls
          style={{
            width: '100%',
            borderRadius: '0.5rem',
            maxHeight: '300px',
          }}
        />
      )}
      {!isLoading && (
        <>
          {/* Crop Button - only show for images */}
          {onCropImage && selectedImage && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCropImage();
              }}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '3.5rem',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                borderRadius: '50%',
                padding: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
              }}
              title="Crop image"
            >
              <Crop size={16} />
            </button>
          )}
          
          {/* Remove Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveMedia();
            }}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              borderRadius: '50%',
              padding: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease-in-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }}
            title="Remove image"
          >
            <X size={16} />
          </button>
        </>
      )}
    </div>
  );
};

export default MediaPreview;
