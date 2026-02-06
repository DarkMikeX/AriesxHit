import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/common/Navbar';

function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.getStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="dashboard-page">
        <Navbar title="Dashboard" />
        <div className="loading-container">
          <div className="futuristic-loader">
            <div className="loader-ring"></div>
            <div className="loader-ring"></div>
            <div className="loader-ring"></div>
            <p>Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  const userStats = stats?.users || {};
  const sessionStats = stats?.sessions || {};
  const loginStats = stats?.logins || {};

  return (
    <div className="dashboard-page">
      <Navbar title="📊 Dashboard">
        <button className="refresh-btn" onClick={fetchStats} disabled={loading}>
          <span>🔄</span>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </Navbar>

      <div className="dashboard-content">
        {error && (
          <div className="error-banner glass">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Welcome Section */}
        <div className="welcome-section glass">
          <div className="welcome-content">
            <h2 className="welcome-title">
              Welcome back, <span className="highlight">Admin</span>
            </h2>
            <p className="welcome-subtitle">Monitor and manage your system from here</p>
          </div>
          <div className="welcome-stats">
            <QuickStat label="Total Users" value={userStats.total || 0} color="primary" />
            <QuickStat label="Active Now" value={sessionStats.active || 0} color="success" />
            <QuickStat label="Pending" value={userStats.pending || 0} color="warning" />
          </div>
        </div>

        {/* User Statistics */}
        <section className="stats-section">
          <SectionHeader 
            title="👥 User Statistics" 
            subtitle="Overview of user accounts and status"
          />
          <div className="stats-grid">
            <StatCard 
              title="Total Users" 
              value={userStats.total || 0}
              icon="👥"
              color="primary"
              trend={userStats.totalGrowth}
              onClick={() => navigate('/users/active')}
            />
            <StatCard 
              title="Pending Approval" 
              value={userStats.pending || 0}
              icon="⏳"
              color="warning"
              trend={userStats.pendingGrowth}
              onClick={() => navigate('/users/pending')}
            />
            <StatCard 
              title="Active Users" 
              value={userStats.active || 0}
              icon="✅"
              color="success"
              trend={userStats.activeGrowth}
              onClick={() => navigate('/users/active')}
            />
            <StatCard 
              title="Blocked Users" 
              value={userStats.blocked || 0}
              icon="🚫"
              color="danger"
              trend={userStats.blockedGrowth}
            />
          </div>
        </section>

        {/* Session Statistics */}
        <section className="stats-section">
          <SectionHeader 
            title="🔐 Session Statistics" 
            subtitle="Current session activity and history"
          />
          <div className="stats-grid">
            <StatCard 
              title="Total Sessions" 
              value={sessionStats.total || 0}
              icon="🔐"
              color="secondary"
              trend={sessionStats.totalGrowth}
            />
            <StatCard 
              title="Active Sessions" 
              value={sessionStats.active || 0}
              icon="⚡"
              color="success"
              trend={sessionStats.activeGrowth}
            />
            <StatCard 
              title="Expired Sessions" 
              value={sessionStats.expired || 0}
              icon="⏰"
              color="muted"
              trend={sessionStats.expiredGrowth}
            />
          </div>
        </section>

        {/* Login Activity */}
        <section className="stats-section">
          <SectionHeader 
            title="📈 Login Activity (24h)" 
            subtitle="Authentication attempts and success rates"
          />
          <div className="stats-grid">
            <StatCard 
              title="Total Attempts" 
              value={loginStats.total || 0}
              icon="📊"
              color="primary"
              trend={loginStats.totalGrowth}
            />
            <StatCard 
              title="Successful" 
              value={loginStats.successful || 0}
              icon="✅"
              color="success"
              trend={loginStats.successfulGrowth}
            />
            <StatCard 
              title="Failed" 
              value={loginStats.failed || 0}
              icon="❌"
              color="danger"
              trend={loginStats.failedGrowth}
            />
            <StatCard 
              title="Success Rate" 
              value={`${loginStats.successRate || 0}%`}
              icon="🎯"
              color="accent"
              trend={loginStats.successRateGrowth}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
  );
}

function QuickStat({ label, value, color }) {
  return (
    <div className={`quick-stat ${color}`}>
      <span className="quick-stat-value">{value}</span>
      <span className="quick-stat-label">{label}</span>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`stat-card glass ${color} ${onClick ? 'clickable' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ animationDelay: `${Math.random() * 0.3}s` }}
    >
      <div className="stat-card-header">
        <div className="stat-icon-wrapper">
          <span className="stat-icon">{icon}</span>
          <div className="icon-glow"></div>
        </div>
        {trend !== undefined && (
          <div className={`stat-trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}`}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div className="stat-card-body">
        <h3 className="stat-title">{title}</h3>
        <p className="stat-value">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>

      <div className="stat-card-footer">
        <div className="stat-bar">
          <div 
            className="stat-bar-fill" 
            style={{ 
              width: `${Math.min((typeof value === 'number' ? value : 0) / 1000 * 100, 100)}%`,
              transition: 'width 1s ease-out'
            }}
          ></div>
        </div>
      </div>

      {isHovered && <div className="card-shimmer"></div>}
    </div>
  );
}

export default DashboardPage;
