import React, { useState, useEffect } from 'react';
import { useUsers } from '../hooks/useUsers';
import ApprovalModal from '../components/users/ApprovalModal';
import '../styles/users.css';

function PendingUsersPage() {
  const { users, loading, error, fetchPendingUsers, approveUser, rejectUser } = useUsers();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const handleApprove = (user) => {
    setSelectedUser(user);
    setShowApprovalModal(true);
  };

  const handleApproveSubmit = async (password, permissions) => {
    if (!selectedUser) return;
    
    setActionLoading(selectedUser.id);
    try {
      await approveUser(selectedUser.id, password, permissions);
      setMessage({ type: 'success', text: `User ${selectedUser.username} approved successfully!` });
      setShowApprovalModal(false);
      setSelectedUser(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to approve user' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (user) => {
    if (!window.confirm(`Are you sure you want to reject ${user.username}? This will delete their account.`)) {
      return;
    }

    setActionLoading(user.id);
    try {
      await rejectUser(user.id);
      setMessage({ type: 'success', text: `User ${user.username} rejected and removed.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to reject user' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>⏳ Pending Users</h1>
        <p style={styles.subtitle}>Users waiting for approval ({users.length})</p>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: message.type === 'success' ? '#10b981' : '#ef4444',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
        }}>
          {message.text}
          <button onClick={() => setMessage(null)} style={styles.closeMsg}>×</button>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Loading pending users...</div>
      ) : error ? (
        <div style={styles.error}>
          <p>⚠️ {error}</p>
          <button onClick={fetchPendingUsers} style={styles.retryBtn}>Retry</button>
        </div>
      ) : users.length === 0 ? (
        <div style={styles.empty}>
          <p>✅ No pending users</p>
          <p style={styles.emptySubtext}>All users have been processed!</p>
        </div>
      ) : (
        <div style={styles.usersList}>
          {users.map(user => (
            <div key={user.id} style={styles.userCard}>
              <div style={styles.userInfo}>
                <div style={styles.avatar}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={styles.username}>{user.username}</h3>
                  <p style={styles.userMeta}>
                    Registered: {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
              <div style={styles.userActions}>
                <button
                  onClick={() => handleApprove(user)}
                  disabled={actionLoading === user.id}
                  style={{ ...styles.btn, ...styles.approveBtn }}
                >
                  {actionLoading === user.id ? '...' : '✓ Approve'}
                </button>
                <button
                  onClick={() => handleReject(user)}
                  disabled={actionLoading === user.id}
                  style={{ ...styles.btn, ...styles.rejectBtn }}
                >
                  {actionLoading === user.id ? '...' : '✕ Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showApprovalModal && selectedUser && (
        <ApprovalModal
          user={selectedUser}
          onApprove={handleApproveSubmit}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedUser(null);
          }}
          loading={actionLoading === selectedUser.id}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
  },
  header: {
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#888',
    fontSize: '14px',
    margin: 0,
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeMsg: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    fontSize: '20px',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: '40px',
  },
  error: {
    textAlign: 'center',
    color: '#ef4444',
    padding: '40px',
  },
  retryBtn: {
    marginTop: '16px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#667eea',
    color: '#fff',
    cursor: 'pointer',
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
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  userCard: {
    background: 'rgba(26, 26, 46, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  userMeta: {
    margin: 0,
    fontSize: '13px',
    color: '#888',
  },
  userActions: {
    display: 'flex',
    gap: '12px',
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

export default PendingUsersPage;
