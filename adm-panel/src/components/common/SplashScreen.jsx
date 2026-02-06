import React, { useState, useEffect } from 'react';
import './SplashScreen.css';

function SplashScreen({ onComplete }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Total duration: 3.5 seconds for fast-paced tutorial video feel
    const totalDuration = 3500;

    // Phase timings - faster transitions for cinematic feel
    const phases = [
      { duration: 800, name: 'intro' },
      { duration: 1000, name: 'reveal' },
      { duration: 1200, name: 'build' },
      { duration: 500, name: 'launch' }
    ];

    let startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(progressPercent);

      // Update phase based on elapsed time
      let cumulativeTime = 0;
      for (let i = 0; i < phases.length; i++) {
        cumulativeTime += phases[i].duration;
        if (elapsed < cumulativeTime) {
          setCurrentPhase(i);
          break;
        } else if (i === phases.length - 1) {
          setCurrentPhase(phases.length - 1);
        }
      }

      if (elapsed < totalDuration) {
        requestAnimationFrame(updateProgress);
      } else {
        // Complete splash screen
        setTimeout(() => {
          onComplete();
        }, 200); // Quick transition
      }
    };

    requestAnimationFrame(updateProgress);

    // Cleanup
    return () => {
      // Any cleanup if needed
    };
  }, [onComplete]);

  const getPhaseContent = () => {
    switch (currentPhase) {
      case 0: // Intro - Dramatic entrance
        return {
          title: 'ARIES',
          subtitle: 'CONTROL',
          accent: 'SYSTEM',
          description: 'Advanced Administrative Interface',
          primaryColor: '#6b46c1', // Dark purple
          secondaryColor: '#374151', // Dark grey
          accentColor: '#1f2937', // Darker grey
          bgGradient: 'linear-gradient(45deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)'
        };
      case 1: // Reveal - Brand expansion
        return {
          title: 'ARIESXHIT',
          subtitle: 'PROFESSIONAL',
          accent: 'SUITE',
          description: 'Enterprise-Grade Security Platform',
          primaryColor: '#4c1d95', // Deep purple
          secondaryColor: '#6b7280', // Medium grey
          accentColor: '#9ca3af', // Light grey
          bgGradient: 'linear-gradient(45deg, #0a0a0a 0%, #2a2a2a 50%, #0a0a0a 100%)'
        };
      case 2: // Build - System construction
        return {
          title: 'INITIALIZING',
          subtitle: 'SECURE',
          accent: 'PROTOCOLS',
          description: 'Loading Advanced Features & Modules',
          primaryColor: '#1e293b', // Dark slate
          secondaryColor: '#475569', // Slate grey
          accentColor: '#64748b', // Medium slate
          bgGradient: 'linear-gradient(45deg, #0a0a0a 0%, #3a3a3a 50%, #0a0a0a 100%)'
        };
      case 3: // Launch - Final activation
        return {
          title: 'SYSTEM',
          subtitle: 'READY',
          accent: 'LAUNCH',
          description: 'Welcome to AriesxHit Control Center',
          primaryColor: '#0f172a', // Very dark blue
          secondaryColor: '#334155', // Dark blue-grey
          accentColor: '#64748b', // Medium blue-grey
          bgGradient: 'linear-gradient(45deg, #0a0a0a 0%, #4a4a4a 50%, #0a0a0a 100%)'
        };
      default:
        return {};
    }
  };

  const phaseContent = getPhaseContent();

  return (
    <div className="splash-screen" style={{ background: phaseContent.bgGradient }}>
      {/* Cinematic Background Elements */}
      <div className="cinematic-bg">
        {/* Grid Pattern Overlay */}
        <div className="grid-overlay"></div>

        {/* Geometric Shapes */}
        <div className="geometric-shapes">
          <div className="shape shape-1" style={{ borderColor: phaseContent.primaryColor }}></div>
          <div className="shape shape-2" style={{ borderColor: phaseContent.secondaryColor }}></div>
          <div className="shape shape-3" style={{ borderColor: phaseContent.accentColor }}></div>
          <div className="shape shape-4" style={{ borderColor: phaseContent.primaryColor }}></div>
        </div>

        {/* Energy Particles */}
        <div className="energy-particles">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="energy-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
                backgroundColor: [phaseContent.primaryColor, phaseContent.secondaryColor, phaseContent.accentColor][Math.floor(Math.random() * 3)]
              }}
            />
          ))}
        </div>

        {/* Scan Lines */}
        <div className="scan-lines">
          <div className="scan-line" style={{ backgroundColor: phaseContent.primaryColor }}></div>
          <div className="scan-line" style={{ backgroundColor: phaseContent.secondaryColor }}></div>
        </div>
      </div>

      {/* Main Cinematic Content */}
      <div className="cinematic-content">
        {/* Title Sequence */}
        <div className="title-sequence">
          <div className="title-main" style={{ color: phaseContent.primaryColor }}>
            {phaseContent.title}
          </div>
          <div className="title-secondary" style={{ color: phaseContent.secondaryColor }}>
            {phaseContent.subtitle}
          </div>
          <div className="title-accent" style={{ color: phaseContent.accentColor }}>
            {phaseContent.accent}
          </div>
        </div>

        {/* Description */}
        <div className="cinematic-description">
          {phaseContent.description}
        </div>

        {/* Progress Indicator */}
        <div className="cinematic-progress">
          <div className="progress-track">
            <div
              className="progress-beam"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${phaseContent.primaryColor}, ${phaseContent.secondaryColor})`
              }}
            ></div>
            <div className="progress-glow" style={{ boxShadow: `0 0 20px ${phaseContent.primaryColor}` }}></div>
          </div>
          <div className="progress-percentage" style={{ color: phaseContent.accentColor }}>
            {Math.round(progress)}%
          </div>
        </div>

        {/* Tech Indicators */}
        <div className="tech-indicators">
          <div className="indicator" style={{ borderColor: phaseContent.primaryColor }}>
            <div className="indicator-dot" style={{ backgroundColor: phaseContent.primaryColor }}></div>
            <span style={{ color: phaseContent.primaryColor }}>SECURE</span>
          </div>
          <div className="indicator" style={{ borderColor: phaseContent.secondaryColor }}>
            <div className="indicator-dot" style={{ backgroundColor: phaseContent.secondaryColor }}></div>
            <span style={{ color: phaseContent.secondaryColor }}>ACTIVE</span>
          </div>
          <div className="indicator" style={{ borderColor: phaseContent.accentColor }}>
            <div className="indicator-dot" style={{ backgroundColor: phaseContent.accentColor }}></div>
            <span style={{ color: phaseContent.accentColor }}>READY</span>
          </div>
        </div>
      </div>

      {/* Cinematic Effects */}
      <div className="cinematic-effects">
        <div className="vignette"></div>
        <div className="light-rays">
          <div className="ray ray-1" style={{ background: `linear-gradient(180deg, transparent, ${phaseContent.primaryColor}20)` }}></div>
          <div className="ray ray-2" style={{ background: `linear-gradient(180deg, transparent, ${phaseContent.secondaryColor}20)` }}></div>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
