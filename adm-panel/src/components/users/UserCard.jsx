import React from 'react';
import { formatRelativeTime } from '../../utils/formatters';

function UserCard({ user, actions, statusColor = '#667eea' }) {
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
    <div style={styles.card}>
      <div style={styles.userInfo}>
        <div style={{ ...styles.avatar, background: statusColor }}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={styles.nameRow}>
            <h3 style={styles.username}>{user.username}</h3>
            <div style={styles.badges}>
              {getPermissionBadges(user.permissions).map((badge, i) => (
                <span key={i} style={{ ...styles.badge, background: badge.color }}>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
          <p style={styles.meta}>
            {user.last_login 
              ? `Last login: ${formatRelativeTime(user.last_login)}`
              : `Registered: ${formatRelativeTime(user.created_at)}`
            }
          </p>
        </div>
      </div>
      {actions && (
        <div style={styles.actions}>
          {actions}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
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
  meta: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#888',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
};

export default UserCard;
