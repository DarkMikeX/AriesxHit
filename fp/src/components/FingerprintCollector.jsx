import React, { useState, useEffect } from 'react';
import { generateFingerprint } from '../utils/fingerprint';

function FingerprintCollector({ onReady }) {
  const [status, setStatus] = useState('collecting'); // collecting, success, error
  const [fingerprint, setFingerprint] = useState(null);
  const [details, setDetails] = useState({});

  useEffect(() => {
    collectFingerprint();
  }, []);

  const collectFingerprint = async () => {
    try {
      setStatus('collecting');
      
      const result = await generateFingerprint();
      
      setFingerprint(result.hash);
      setDetails(result.components);
      setStatus('success');
      
      if (onReady) {
        onReady(result.hash);
      }
    } catch (err) {
      console.error('Fingerprint error:', err);
      setStatus('error');
    }
  };

  return (
    <div className="fingerprint-collector">
      <div className="fingerprint-header">
        <div className={`fingerprint-icon ${status}`}>
          {status === 'collecting' && '🔍'}
          {status === 'success' && '✅'}
          {status === 'error' && '❌'}
        </div>
        <h3>
          {status === 'collecting' && 'Collecting Device Fingerprint...'}
          {status === 'success' && 'Device Identified'}
          {status === 'error' && 'Collection Failed'}
        </h3>
      </div>

      {status === 'collecting' && (
        <div className="collecting-animation">
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay-1"></div>
          <div className="pulse-ring delay-2"></div>
        </div>
      )}

      {status === 'success' && (
        <div className="fingerprint-details">
          <div className="fingerprint-hash">
            <span className="hash-label">Device ID:</span>
            <code className="hash-value">{fingerprint?.slice(0, 16)}...</code>
          </div>
          
          <div className="device-info">
            <div className="info-item">
              <span className="info-icon">🖥️</span>
              <span className="info-label">Platform</span>
              <span className="info-value">{details.platform || 'Unknown'}</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🌐</span>
              <span className="info-label">Browser</span>
              <span className="info-value">{details.browser || 'Unknown'}</span>
            </div>
            <div className="info-item">
              <span className="info-icon">📐</span>
              <span className="info-label">Screen</span>
              <span className="info-value">{details.screen || 'Unknown'}</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🕐</span>
              <span className="info-label">Timezone</span>
              <span className="info-value">{details.timezone || 'Unknown'}</span>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="fingerprint-error">
          <p>Unable to collect device fingerprint.</p>
          <button className="btn btn-secondary" onClick={collectFingerprint}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default FingerprintCollector;
