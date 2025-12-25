import React from 'react';

function Navbar({ title, children }) {
  return (
    <header style={styles.navbar}>
      <h1 style={styles.title}>{title}</h1>
      <div style={styles.actions}>
        {children}
      </div>
    </header>
  );
}

const styles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'rgba(26, 26, 46, 0.6)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#fff',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
};

export default Navbar;
