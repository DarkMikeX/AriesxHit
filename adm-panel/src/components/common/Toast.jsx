import React from 'react';

function Toast({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            ...styles.toast,
            ...styles[toast.type] || styles.info,
          }}
        >
          <span style={styles.message}>{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            style={styles.closeBtn}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: 9999,
    maxWidth: '400px',
  },
  toast: {
    padding: '14px 20px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backdropFilter: 'blur(10px)',
    animation: 'slideIn 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  success: {
    background: 'rgba(16, 185, 129, 0.9)',
    border: '1px solid #10b981',
    color: '#fff',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.9)',
    border: '1px solid #ef4444',
    color: '#fff',
  },
  warning: {
    background: 'rgba(245, 158, 11, 0.9)',
    border: '1px solid #f59e0b',
    color: '#fff',
  },
  info: {
    background: 'rgba(59, 130, 246, 0.9)',
    border: '1px solid #3b82f6',
    color: '#fff',
  },
  message: {
    fontSize: '14px',
    fontWeight: '500',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: '20px',
    cursor: 'pointer',
    opacity: 0.8,
    padding: 0,
    lineHeight: 1,
  },
};

export default Toast;
