import React from 'react';

function ConfirmDialog({ 
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmType = 'danger', // 'danger', 'warning', 'primary'
  onConfirm,
  onCancel,
  loading = false,
}) {
  const confirmStyles = {
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    },
    warning: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        
        <div style={styles.actions}>
          <button
            onClick={onCancel}
            style={styles.cancelBtn}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...styles.confirmBtn,
              ...confirmStyles[confirmType],
            }}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  dialog: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#fff',
  },
  message: {
    margin: '0 0 24px 0',
    fontSize: '15px',
    color: '#aaa',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'transparent',
    color: '#888',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default ConfirmDialog;
