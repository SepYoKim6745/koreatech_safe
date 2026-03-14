import React, { useEffect } from 'react';

const Modal = ({ isOpen, title, message, children, onConfirm, onCancel, confirmText = "확인", cancelText = "취소", isDanger = false, showCancel = true }) => {
  // 모달이 열리면 스크롤 막기
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {message && <p className="modal-message">{message}</p>}
        {children}
        <div className="modal-actions">
          {showCancel && (
            <button className="modal-btn cancel" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button 
            className={`modal-btn confirm ${isDanger ? 'danger' : ''}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
