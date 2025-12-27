import React, { useState, useEffect } from 'react';
import { useUsers } from '../hooks/useUsers';
import PermissionEditor from '../components/users/PermissionEditor';
import '../styles/users.css';

function ActiveUsersPage() {
  const { users, loading, error, fetchActiveUsers, blockUser, updatePermissions, deleteUser } = useUsers();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchActiveUsers();
  }, [fetchActiveUsers]);

  const handleBlock = async (user) => {
    const reason = window.prompt(`Enter reason for blocking ${user.username}:`);
    if (reason === null) return; // Cancelled

    setActionLoading(user.id);
    try {
      await blockUser(user.id, reason);
      setMessage({ type: 'success', text: `User ${user.username} blocked.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to block user' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditPermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionModal(true);
  };

  const handlePermissionsUpdate = async (permissions) => {
    if (!selectedUser) return;

    setActionLoading(selectedUser.id);
    try {
      await updatePermissions(selectedUser.id, permissions);
      setMessage({ type: 'success', text: `Permissions updated for ${selectedUser.username}` });
      setShowPermissionModal(false);
      setSelectedUser(null);
      fetchActiveUsers(); // Refresh
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update permissions' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.username}? This cannot be undone.`)) {
      return;
    }

    setActionLoading(user.id);
    try {
      await deleteUser(user.id);
      setMessage({ type: 'success', text: `User ${user.username} deleted.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete user' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getPermissionBadges = (permissions) => {
    if (!permissions) return [];
    const perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;
    const badges = [];
    if (perms.admin) badges.push({ label: 'Admin', color: '#ef4444' });
    if (perms.auto_hit) badges.push({ label: 'Auto Hit', color: '#10b981' });
    if (perms.bypass) badges.push({ label: 'Bypass', color: '#f59e0b' });
    return badges;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>✅ Active Users</h1>
        <p style={styles.subtitle}>Manage active users ({users.length})</p>
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
        <div style={styles.loading}>Loading active users...</div>
      ) : error ? (
        <div style={styles.error}>
          <p>⚠️ {error}</p>
          <button onClick={fetchActiveUsers} style={styles.retryBtn}>Retry</button>
        </div>
      ) : users.length === 0 ? (
        <div style={styles.empty}>
          <p>No active users</p>
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
                  <div style={styles.usernameRow}>
                    <h3 style={styles.username}>{user.username}</h3>
                    <div style={styles.badges}>
                      {getPermissionBadges(user.permissions).map((badge, i) => (
                        <span key={i} style={{ ...styles.badge, background: badge.color }}>
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p style={styles.userMeta}>
                    Last login: {formatDate(user.last_login)}
                  </p>
                </div>
              </div>
              <div style={styles.userActions}>
                <button
                  onClick={() => handleEditPermissions(user)}
                  disabled={actionLoading === user.id}
                  style={{ ...styles.btn, ...styles.editBtn }}
                >
                  ✏️ Permissions
                </button>
                <button
                  onClick={() => handleBlock(user)}
                  disabled={actionLoading === user.id || (typeof user.permissions === 'object' ? user.permissions?.admin : JSON.parse(user.permissions || '{}').admin)}
                  style={{ ...styles.btn, ...styles.blockBtn }}
                >
                  🚫 Block
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={actionLoading === user.id || (typeof user.permissions === 'object' ? user.permissions?.admin : JSON.parse(user.permissions || '{}').admin)}
                  style={{ ...styles.btn, ...styles.deleteBtn }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPermissionModal && selectedUser && (
        <PermissionEditor
          user={selectedUser}
          onSave={handlePermissionsUpdate}
          onClose={() => {
            setShowPermissionModal(false);
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
    color: '#888',
    fontSize: '18px',
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
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
  },
  usernameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  username: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  badges: {
    display: 'flex',
    gap: '6px',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#fff',
  },
  userMeta: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#888',
  },
  userActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
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

export default ActiveUsersPage;
