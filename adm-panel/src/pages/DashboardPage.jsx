import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/dashboard.css';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.getStats();
      setStats(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>⚠️ {error}</p>
        <button onClick={fetchStats} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  const userStats = stats?.users || {};
  const sessionStats = stats?.sessions || {};
  const loginStats = stats?.logins || {};

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Dashboard</h1>
        <p style={styles.subtitle}>Overview of system statistics</p>
      </div>

      {/* User Stats */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>👥 Users</h2>
        <div style={styles.statsGrid}>
          <StatCard 
            title="Total Users" 
            value={userStats.total || 0} 
            color="#667eea" 
          />
          <StatCard 
            title="Pending Approval" 
            value={userStats.pending || 0} 
            color="#f59e0b" 
          />
          <StatCard 
            title="Active Users" 
            value={userStats.active || 0} 
            color="#10b981" 
          />
          <StatCard 
            title="Blocked Users" 
            value={userStats.blocked || 0} 
            color="#ef4444" 
          />
        </div>
      </div>

      {/* Session Stats */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔐 Sessions</h2>
        <div style={styles.statsGrid}>
          <StatCard 
            title="Total Sessions" 
            value={sessionStats.total || 0} 
            color="#8b5cf6" 
          />
          <StatCard 
            title="Active Sessions" 
            value={sessionStats.active || 0} 
            color="#10b981" 
          />
          <StatCard 
            title="Expired Sessions" 
            value={sessionStats.expired || 0} 
            color="#6b7280" 
          />
        </div>
      </div>

      {/* Login Stats (Last 24h) */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📈 Login Activity (24h)</h2>
        <div style={styles.statsGrid}>
          <StatCard 
            title="Total Attempts" 
            value={loginStats.total || 0} 
            color="#3b82f6" 
          />
          <StatCard 
            title="Successful" 
            value={loginStats.successful || 0} 
            color="#10b981" 
          />
          <StatCard 
            title="Failed" 
            value={loginStats.failed || 0} 
            color="#ef4444" 
          />
          <StatCard 
            title="Success Rate" 
            value={`${loginStats.successRate || 0}%`} 
            color="#f59e0b" 
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <h3 style={styles.statTitle}>{title}</h3>
      <p style={{ ...styles.statValue, color }}>{value}</p>
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
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ddd',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statCard: {
    background: 'rgba(26, 26, 46, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  statTitle: {
    fontSize: '14px',
    color: '#888',
    fontWeight: '500',
    margin: '0 0 8px 0',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    margin: 0,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    color: '#888',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #333',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    color: '#ef4444',
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

export default DashboardPage;
