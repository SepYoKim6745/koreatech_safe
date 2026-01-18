import React from 'react'

function ImageUpload({ selectedImages = [], onRemoveImage, maxImages = 5 }) {
  return (
    <div className="image-upload">
      {selectedImages.length > 0 && (
        <div className="image-previews">
          {selectedImages.map((img, index) => {
            const isPdf = img.type === 'document' || (img.preview && img.preview.startsWith("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ix"));
            
            return (
              <div key={index} className="image-preview-container">
                {isPdf ? (
                  <div className="pdf-preview-placeholder">
                    <div className="pdf-preview-icon">PDF</div>
                    <span className="pdf-preview-text">
                      {img.fileName || '문서'}
                    </span>
                  </div>
                ) : (
                  <img
                    src={img.preview}
                    alt={`preview-${index}`}
                    className="image-preview"
                  />
                )}
                <button 
                  onClick={() => onRemoveImage(index)} 
                  className="remove-image-button"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default ImageUpload
