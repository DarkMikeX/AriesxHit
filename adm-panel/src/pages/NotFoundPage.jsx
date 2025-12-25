import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.code}>404</h1>
      <h2 style={styles.title}>Page Not Found</h2>
      <p style={styles.text}>The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" style={styles.link}>
        ← Back to Dashboard
      </Link>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    color: '#fff',
    textAlign: 'center',
    padding: '20px',
  },
  code: {
    fontSize: '120px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  title: {
    fontSize: '24px',
    margin: '0 0 10px 0',
  },
  text: {
    color: '#888',
    marginBottom: '20px',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    padding: '10px 20px',
    border: '1px solid #667eea',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },
};

export default NotFoundPage;
