import React from 'react'

function ImageUpload({ selectedImages = [], onRemoveImage, maxImages = 5 }) {
  return (
    <div className="image-upload">
      {selectedImages.length > 0 && (
        <div className="image-previews">
          {selectedImages.map((img, index) => (
            <div key={index} className="image-preview-container">
              <img
                src={img.preview}
                alt={`preview-${index}`}
                className="image-preview"
              />
              <button 
                onClick={() => onRemoveImage(index)} 
                className="remove-image-button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedImages.length > 0 && (
        <div className="image-upload-hint">
          이미지 {selectedImages.length}/{maxImages}
        </div>
      )}
    </div>
  )
}

export default ImageUpload
