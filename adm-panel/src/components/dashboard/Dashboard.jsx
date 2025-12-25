import React from 'react';
import StatsCards from './StatsCards';
import RecentActivity from './RecentActivity';

function Dashboard({ stats, loading, error, onRefresh }) {
  if (loading) {
    return <div style={styles.loading}>Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>⚠️ {error}</p>
        <button onClick={onRefresh} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <StatsCards stats={stats} />
      <RecentActivity stats={stats} />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
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
};

export default Dashboard;
