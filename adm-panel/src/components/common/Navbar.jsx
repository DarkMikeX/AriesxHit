import React, { useState, useEffect } from 'react';

function Navbar({ title, children }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="futuristic-navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <h1 className="navbar-title">
            <span className="title-glow">{title}</span>
          </h1>
          <div className="navbar-divider"></div>
        </div>

        <div className="navbar-right">
          {/* Live Clock */}
          <div className="navbar-clock glass">
            <div className="clock-icon">⏱</div>
            <div className="clock-content">
              <div className="clock-time">{formatTime(time)}</div>
              <div className="clock-date">{formatDate(time)}</div>
            </div>
          </div>

          {/* Actions */}
          {children && (
            <div className="navbar-actions">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Animated Bottom Border */}
      <div className="navbar-border">
        <div className="border-glow"></div>
      </div>
    </header>
  );
}

export default Navbar;
