import React from 'react';

function AuthLayout({ children }) {
  return (
    <div style={styles.container}>
      {children}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
  },
};

export default AuthLayout;
