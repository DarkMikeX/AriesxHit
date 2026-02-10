import React from 'react';

function RecentActivity({ stats }) {
  const loginStats = stats?.logins || {};

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📈 Login Activity (Last 24h)</h2>
      
      <div style={styles.grid}>
        <div style={styles.statBox}>
          <span style={styles.label}>Total Attempts</span>
          <span style={{ ...styles.value, color: '#3b82f6' }}>{loginStats.total || 0}</span>
        </div>
        
        <div style={styles.statBox}>
          <span style={styles.label}>Successful</span>
          <span style={{ ...styles.value, color: '#10b981' }}>{loginStats.successful || 0}</span>
        </div>
        
        <div style={styles.statBox}>
          <span style={styles.label}>Failed</span>
          <span style={{ ...styles.value, color: '#ef4444' }}>{loginStats.failed || 0}</span>
        </div>
        
        <div style={styles.statBox}>
          <span style={styles.label}>Success Rate</span>
          <span style={{ ...styles.value, color: '#f59e0b' }}>{loginStats.successRate || 0}%</span>
        </div>
        
        <div style={styles.statBox}>
          <span style={styles.label}>Unique Users</span>
          <span style={{ ...styles.value, color: '#8b5cf6' }}>{loginStats.uniqueUsers || 0}</span>
        </div>
        
        <div style={styles.statBox}>
          <span style={styles.label}>Unique IPs</span>
          <span style={{ ...styles.value, color: '#667eea' }}>{loginStats.uniqueIPs || 0}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(26, 26, 46, 0.4)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#ddd',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
  },
  statBox: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0, // Allow shrinking
  },
  label: {
    fontSize: '12px',
    color: '#888',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  value: {
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '1.2',
  },
};

export default RecentActivity;
