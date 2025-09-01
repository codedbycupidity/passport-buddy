import { useRef, useState } from 'react';
import { correctImageOrientation } from '../utils/imageOrientation';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const useFileUpload = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select a valid image file (JPG, PNG, GIF, WebP)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size should not exceed 10MB';
    }
    return null;
  };

  const handleImageClick = () => {
    console.log('handleImageClick called, ref:', imageInputRef.current);
    if (imageInputRef.current) {
      imageInputRef.current.click();
    } else {
      console.error('Image input ref is null');
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      
      try {
        // Clean up previous preview URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        
        // Correct image orientation and create preview
        const { file: correctedFile, url } = await correctImageOrientation(file);
        setSelectedImage(correctedFile);
        setPreviewUrl(url);
      } catch (err) {
        console.error('Error correcting image orientation:', err);
        // Fallback to original file if correction fails
        setSelectedImage(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const uploadImage = async (url: string): Promise<{ url: string } | null> => {
    if (!selectedImage) return null;

    const formData = new FormData();
    formData.append('avatar', selectedImage);

    try {
      const token = localStorage.getItem('passport_buddy_token');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const data = await response.json();
      return data.data.avatar;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      return null;
    }
  };

  return {
    selectedImage,
    previewUrl,
    error,
    imageInputRef,
    handleImageClick,
    handleImageChange,
    removeImage,
    uploadImage,
  };
};
