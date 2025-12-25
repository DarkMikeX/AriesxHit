import React from 'react';

function SuccessMessage({ user }) {
  return (
    <div className="success-card">
      <div className="success-icon">
        <span className="checkmark">✓</span>
      </div>

      <h2>Registration Approved! 🎉</h2>
      <p className="success-message">
        Your device has been approved. You can now use the AriesxHit extension.
      </p>

      {user && (
        <div className="user-info-card success">
          <h3>Account Details</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Username</span>
              <span className="info-value">{user.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="status-badge approved">Approved</span>
            </div>
          </div>
        </div>
      )}

      <div className="next-steps">
        <h4>🚀 Next Steps</h4>
        <ol>
          <li>Open the AriesxHit browser extension</li>
          <li>Click "Login" on the extension popup</li>
          <li>Your device will be automatically authenticated</li>
          <li>Start using all features!</li>
        </ol>
      </div>

      <div className="success-actions">
        <a href="#" className="btn btn-primary" onClick={(e) => { e.preventDefault(); window.close(); }}>
          Close & Open Extension
        </a>
      </div>
    </div>
  );
}

export default SuccessMessage;
