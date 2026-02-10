import React from 'react';

function StatsCards({ stats }) {
  const userStats = stats?.users || {};
  const sessionStats = stats?.sessions || {};

  const cards = [
    { title: 'Total Users', value: userStats.total || 0, color: '#667eea', icon: '👥' },
    { title: 'Pending', value: userStats.pending || 0, color: '#f59e0b', icon: '⏳' },
    { title: 'Active', value: userStats.active || 0, color: '#10b981', icon: '✅' },
    { title: 'Blocked', value: userStats.blocked || 0, color: '#ef4444', icon: '🚫' },
    { title: 'Active Sessions', value: sessionStats.active || 0, color: '#8b5cf6', icon: '🔐' },
  ];

  return (
    <div style={styles.grid}>
      {cards.map((card, i) => (
        <div key={i} style={{ ...styles.card, borderTop: `3px solid ${card.color}` }}>
          <div style={styles.cardHeader}>
            <span style={styles.icon}>{card.icon}</span>
            <h3 style={styles.title}>{card.title}</h3>
          </div>
          <p style={{ ...styles.value, color: card.color }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(26, 26, 46, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  icon: {
    fontSize: '18px',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    color: '#888',
    fontWeight: '500',
  },
  value: {
    margin: 0,
    fontSize: '32px',
    fontWeight: '700',
  },
};

export default StatsCards;
