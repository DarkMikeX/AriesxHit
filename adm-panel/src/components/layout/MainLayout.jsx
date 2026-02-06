import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate floating particles
    const generateParticles = () => {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 10 + Math.random() * 10,
      }));
      setParticles(newParticles);
    };
    generateParticles();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: '⚡', label: 'Dashboard', id: 'dashboard' },
    { path: '/users/pending', icon: '⏳', label: 'Pending Users', id: 'pending' },
    { path: '/users/active', icon: '✅', label: 'Active Users', id: 'active' },
  ];

  return (
    <div className="futuristic-layout">
      {/* Animated Background Particles */}
      <div className="particles-container">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <aside className={`futuristic-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          {/* Logo Section */}
          <div className="logo-section">
            <div className="logo-icon-wrapper">
              <div className="logo-glow"></div>
              <span className="logo-icon">⚡</span>
            </div>
            <div className="logo-text-wrapper">
              <span className="logo-text">AriesxHit</span>
              <span className="logo-subtitle">Admin Portal</span>
            </div>
            <button 
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <span className={sidebarOpen ? 'icon-close' : 'icon-open'}>☰</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="futuristic-nav">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {isActive && <div className="nav-indicator"></div>}
                  <div className="nav-glow"></div>
                </NavLink>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="sidebar-user-section">
            <div className="user-card glass">
              <div className="user-avatar-wrapper">
                <div className="avatar-ring"></div>
                <div className="user-avatar">
                  {user?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
              </div>
              <div className="user-info">
                <p className="user-name">{user?.username || 'Admin'}</p>
                <p className="user-role">Administrator</p>
                <div className="user-status">
                  <span className="status-dot"></span>
                  <span>Online</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout} 
              className="logout-btn"
            >
              <span className="btn-icon">🚪</span>
              <span className="btn-text">Logout</span>
              <div className="btn-shine"></div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="futuristic-main">
        <div className="main-content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default MainLayout;
