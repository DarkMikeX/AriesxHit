import React from 'react';
import UserCard from './UserCard';

function PendingUsersList({ users, onApprove, onReject, loading }) {
  if (!users || users.length === 0) {
    return (
      <div style={styles.empty}>
        <p>✅ No pending users</p>
        <p style={styles.emptySubtext}>All users have been processed!</p>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          statusColor="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          actions={
            <>
              <button
                onClick={() => onApprove(user)}
                disabled={loading === user.id}
                style={{ ...styles.btn, ...styles.approveBtn }}
              >
                {loading === user.id ? '...' : '✓ Approve'}
              </button>
              <button
                onClick={() => onReject(user)}
                disabled={loading === user.id}
                style={{ ...styles.btn, ...styles.rejectBtn }}
              >
                {loading === user.id ? '...' : '✕ Reject'}
              </button>
            </>
          }
        />
      ))}
    </div>
  );
}

const styles = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    color: '#10b981',
    fontSize: '18px',
  },
  emptySubtext: {
    color: '#666',
    fontSize: '14px',
    marginTop: '8px',
  },
  btn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, opacity 0.2s',
  },
  approveBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
  },
  rejectBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
};

export default PendingUsersList;
