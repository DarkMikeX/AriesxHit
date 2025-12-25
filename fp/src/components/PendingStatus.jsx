import React, { useState, useEffect } from 'react';

function PendingStatus({ user, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setLastChecked(new Date());
    setRefreshing(false);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="pending-card">
      <div className="pending-icon">
        <div className="clock-animation">
          <span>⏳</span>
        </div>
      </div>

      <h2>Registration Pending</h2>
      <p className="pending-message">
        Your registration is awaiting admin approval. 
        You'll be notified once your request is reviewed.
      </p>

      {user && (
        <div className="user-info-card">
          <h3>Your Registration Details</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Username</span>
              <span className="info-value">{user.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
            {user.telegram && (
              <div className="info-row">
                <span className="info-label">Telegram</span>
                <span className="info-value">{user.telegram}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Submitted</span>
              <span className="info-value">{formatDate(user.created_at)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="status-badge pending">Pending Review</span>
            </div>
          </div>
        </div>
      )}

      <div className="pending-actions">
        <button 
          className={`btn btn-secondary ${refreshing ? 'loading' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <span className="spinner"></span>
              Checking...
            </>
          ) : (
            <>
              🔄 Check Status
            </>
          )}
        </button>
        
        <p className="last-checked">
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      </div>

      <div className="pending-tips">
        <h4>💡 What happens next?</h4>
        <ul>
          <li>An administrator will review your registration</li>
          <li>You'll receive an email when approved</li>
          <li>Once approved, open the extension and login</li>
        </ul>
      </div>
    </div>
  );
}

export default PendingStatus;
