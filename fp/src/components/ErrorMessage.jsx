import React from 'react';

function ErrorMessage({ title, message, onRetry, showRetry = true }) {
  return (
    <div className="error-card">
      <div className="error-icon">
        <span>❌</span>
      </div>

      <h2>{title || 'Something went wrong'}</h2>
      <p className="error-message">{message}</p>

      {showRetry && onRetry && (
        <div className="error-actions">
          <button className="btn btn-primary" onClick={onRetry}>
            🔄 Try Again
          </button>
        </div>
      )}

      <div className="error-help">
        <h4>Need Help?</h4>
        <p>If you continue experiencing issues, please contact support:</p>
        <ul>
          <li>Telegram: @AriesxHitSupport</li>
          <li>Email: support@ariesxhit.com</li>
        </ul>
      </div>
    </div>
  );
}

export default ErrorMessage;
