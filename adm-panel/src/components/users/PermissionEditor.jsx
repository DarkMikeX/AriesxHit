import React, { useState } from 'react';

function PermissionEditor({ user, onSave, onClose, loading }) {
  const initialPermissions = typeof user.permissions === 'string'
    ? JSON.parse(user.permissions || '{}')
    : user.permissions || {};

  const [permissions, setPermissions] = useState({
    auto_hit: initialPermissions.auto_hit || false,
    bypass: initialPermissions.bypass || false,
    admin: initialPermissions.admin || false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(permissions);
  };

  const togglePermission = (perm) => {
    setPermissions(prev => ({
      ...prev,
      [perm]: !prev[perm],
    }));
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Edit Permissions</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span style={styles.username}>{user.username}</span>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.permissions}>
            <label style={styles.permItem}>
              <div style={styles.permInfo}>
                <span style={styles.permIcon}>🎯</span>
                <div>
                  <p style={styles.permName}>Auto Hit</p>
                  <p style={styles.permDesc}>Allows card testing functionality</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={permissions.auto_hit}
                onChange={() => togglePermission('auto_hit')}
                disabled={loading}
                style={styles.toggle}
              />
            </label>

            <label style={styles.permItem}>
              <div style={styles.permInfo}>
                <span style={styles.permIcon}>🔓</span>
                <div>
                  <p style={styles.permName}>Bypass</p>
                  <p style={styles.permDesc}>Allows CVV bypass functionality</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={permissions.bypass}
                onChange={() => togglePermission('bypass')}
                disabled={loading}
                style={styles.toggle}
              />
            </label>

            <label style={styles.permItem}>
              <div style={styles.permInfo}>
                <span style={styles.permIcon}>👑</span>
                <div>
                  <p style={styles.permName}>Admin</p>
                  <p style={styles.permDesc}>Full administrative access</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={permissions.admin}
                onChange={() => togglePermission('admin')}
                disabled={loading}
                style={styles.toggle}
              />
            </label>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.saveBtn}
              disabled={loading}
            >
              {loading ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
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
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
  },
  form: {
    padding: '20px',
  },
  permissions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  permItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  permInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  permIcon: {
    fontSize: '24px',
  },
  permName: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
    color: '#fff',
  },
  permDesc: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#888',
  },
  toggle: {
    width: '48px',
    height: '24px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'transparent',
    color: '#888',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default PermissionEditor;
