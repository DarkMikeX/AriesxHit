import React from 'react';
import UserCard from './UserCard';

function ActiveUsersList({ users, onEdit, onBlock, onDelete, loading }) {
  if (!users || users.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No active users</p>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          statusColor="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          actions={
            <>
              <button
                onClick={() => onEdit(user)}
                disabled={loading === user.id}
                style={{ ...styles.btn, ...styles.editBtn }}
              >
                ✏️ Permissions
              </button>
              <button
                onClick={() => onBlock(user)}
                disabled={loading === user.id}
                style={{ ...styles.btn, ...styles.blockBtn }}
              >
                🚫 Block
              </button>
              <button
                onClick={() => onDelete(user)}
                disabled={loading === user.id}
                style={{ ...styles.btn, ...styles.deleteBtn }}
              >
                🗑️
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
    color: '#888',
    fontSize: '18px',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s, opacity 0.2s',
  },
  editBtn: {
    background: 'rgba(102, 126, 234, 0.2)',
    color: '#667eea',
    border: '1px solid rgba(102, 126, 234, 0.3)',
  },
  blockBtn: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '8px 12px',
  },
};

export default ActiveUsersList;
