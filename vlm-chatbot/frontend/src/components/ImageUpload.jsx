import React, { useRef } from 'react'

function ImageUpload({ selectedImage, onImageSelect }) {
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.')
      return
    }

    // 파일 형식 체크
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('지원하지 않는 파일 형식입니다. (jpg, png, gif, webp만 가능)')
      return
    }

    // 파일을 base64로 변환
    const reader = new FileReader()
    reader.onloadend = () => {
      onImageSelect({
        file,
        base64: reader.result,
        preview: reader.result,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    onImageSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {selectedImage ? (
        <div className="image-preview-container">
          <img
            src={selectedImage.preview}
            alt="preview"
            className="image-preview"
          />
          <button onClick={handleRemoveImage} className="remove-image-button">
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="upload-button"
        >
          📷 이미지 업로드
        </button>
      )}
    </div>
  )
}

export default ImageUpload
