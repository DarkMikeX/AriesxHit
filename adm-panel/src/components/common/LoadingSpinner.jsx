import React from 'react';

function LoadingSpinner({ fullScreen = false, size = 40 }) {
  const containerStyle = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <div style={containerStyle}>
      <div 
        style={{
          ...styles.spinner,
          width: size,
          height: size,
        }}
      />
    </div>
  );
}

const styles = {
  fullScreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10, 10, 15, 0.9)',
    zIndex: 9999,
  },
  inline: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  spinner: {
    border: '3px solid rgba(102, 126, 234, 0.2)',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add keyframes via style tag
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);
}

export default LoadingSpinner;
