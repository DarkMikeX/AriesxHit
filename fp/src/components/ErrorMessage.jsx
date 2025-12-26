import React, { useState, useEffect } from 'react';

function ErrorMessage({ title, message, onRetry, showRetry = true }) {
  const [countdown, setCountdown] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);

  // Extract message and rate limit info
  const errorData = typeof message === 'object' ? message : { message, isRateLimited: false, retryAfter: null };
  const errorMessage = errorData.message || message;
  const isRateLimited = errorData.isRateLimited || false;
  const retryAfterSeconds = errorData.retryAfter || null;

  useEffect(() => {
    if (isRateLimited && retryAfterSeconds) {
      setRetryAfter(retryAfterSeconds);
      setCountdown(retryAfterSeconds);
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setRetryAfter(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRateLimited, retryAfterSeconds]);

  // Extract validation errors if present
  const validationErrors = errorData.errors || null;
  const hasValidationErrors = validationErrors && (
    (Array.isArray(validationErrors) && validationErrors.length > 0) ||
    (typeof validationErrors === 'object' && Object.keys(validationErrors).length > 0)
  );

  return (
    <div className="error-card">
      <div className="error-icon">
        <span>❌</span>
      </div>

      <h2>{title || 'Something went wrong'}</h2>
      <p className="error-message">{errorMessage}</p>

      {hasValidationErrors && (
        <div className="validation-errors">
          <h4>Please fix the following:</h4>
          <ul>
            {Array.isArray(validationErrors) ? (
              validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))
            ) : (
              Object.entries(validationErrors).map(([field, err]) => (
                <li key={field}>
                  <strong>{field}:</strong> {Array.isArray(err) ? err.join(', ') : err}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {isRateLimited && countdown && (
        <div className="rate-limit-info">
          <p className="rate-limit-message">
            ⏱️ Please wait <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''} before trying again.
          </p>
        </div>
      )}

      {showRetry && onRetry && (
        <div className="error-actions">
          <button 
            className="btn btn-primary" 
            onClick={onRetry}
            disabled={isRateLimited && countdown > 0}
          >
            🔄 Try Again
            {isRateLimited && countdown > 0 && ` (${countdown}s)`}
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
