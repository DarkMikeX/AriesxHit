import React from 'react';

function LoadingSpinner({ message, small = false }) {
  if (small) {
    return <span className="spinner-small"></span>;
  }

  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
