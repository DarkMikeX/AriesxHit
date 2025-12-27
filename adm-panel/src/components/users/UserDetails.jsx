import React from 'react';
import { formatDate } from '../../utils/formatters';

function UserDetails({ user, onClose }) {
  const permissions = typeof user.permissions === 'string'
    ? JSON.parse(user.permissions || '{}')
    : user.permissions || {};

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>User Details</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          <div style={styles.avatar}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          
          <h3 style={styles.username}>{user.username}</h3>
          <span style={{
            ...styles.statusBadge,
            background: user.status === 'active' ? '#10b981' : 
                       user.status === 'pending' ? '#f59e0b' : '#ef4444'
          }}>
            {user.status}
          </span>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <label>User ID</label>
              <span>{user.id}</span>
            </div>
            <div style={styles.infoItem}>
              <label>Created</label>
              <span>{formatDate(user.created_at)}</span>
            </div>
            <div style={styles.infoItem}>
              <label>Approved</label>
              <span>{formatDate(user.approved_at)}</span>
            </div>
            <div style={styles.infoItem}>
              <label>Last Login</label>
              <span>{formatDate(user.last_login)}</span>
            </div>
          </div>

          <div style={styles.permissions}>
            <h4 style={styles.permTitle}>Permissions</h4>
            <div style={styles.permList}>
              <div style={styles.permItem}>
                <span>🎯 Auto Hit</span>
                <span style={{ color: permissions.auto_hit ? '#10b981' : '#ef4444' }}>
                  {permissions.auto_hit ? '✓' : '✕'}
                </span>
              </div>
              <div style={styles.permItem}>
                <span>🔓 Bypass</span>
                <span style={{ color: permissions.bypass ? '#10b981' : '#ef4444' }}>
                  {permissions.bypass ? '✓' : '✕'}
                </span>
              </div>
              <div style={styles.permItem}>
                <span>👑 Admin</span>
                <span style={{ color: permissions.admin ? '#10b981' : '#ef4444' }}>
                  {permissions.admin ? '✓' : '✕'}
                </span>
              </div>
            </div>
          </div>

          {user.blocked_reason && (
            <div style={styles.blockedReason}>
              <h4>Block Reason</h4>
              <p>{user.blocked_reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '450px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#fff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '28px',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '16px',
  },
  username: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    marginBottom: '24px',
  },
  infoGrid: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  permissions: {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px',
    padding: '16px',
  },
  permTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#aaa',
  },
  permList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  permItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#ddd',
    fontSize: '14px',
  },
  blockedReason: {
    width: '100%',
    marginTop: '16px',
    padding: '16px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
};

export default UserDetails;
