import React, { useState, useEffect } from 'react';
import RegistrationForm from './components/RegistrationForm';
import PendingStatus from './components/PendingStatus';
import SuccessMessage from './components/SuccessMessage';
import ErrorMessage from './components/ErrorMessage';
import LoadingSpinner from './components/LoadingSpinner';
import { checkExistingRegistration } from './utils/api';
import './App.css';

function App() {
  const [status, setStatus] = useState('loading'); // loading, register, pending, approved, rejected, error
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const fingerprint = localStorage.getItem('ariesxhit_fingerprint');
      
      if (fingerprint) {
        const result = await checkExistingRegistration(fingerprint);
        
        if (result.exists) {
          setUserData(result.user);
          
          switch (result.user.status) {
            case 'approved':
              setStatus('approved');
              break;
            case 'rejected':
              setStatus('rejected');
              break;
            case 'pending':
            default:
              setStatus('pending');
              break;
          }
        } else {
          setStatus('register');
        }
      } else {
        setStatus('register');
      }
    } catch (err) {
      console.error('Status check error:', err);
      setStatus('register');
    }
  };

  const handleRegistrationSuccess = (user, fingerprint) => {
    localStorage.setItem('ariesxhit_fingerprint', fingerprint);
    setUserData(user);
    setStatus('pending');
  };

  const handleRegistrationError = (errorMsg) => {
    setError(errorMsg);
    setStatus('error');
  };

  const handleRetry = () => {
    setError('');
    setStatus('register');
  };

  return (
    <div className="app">
      <div className="background-pattern"></div>
      
      <div className="container">
        <header className="header">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">AriesxHit</span>
          </div>
          <p className="tagline">Device Registration Portal</p>
        </header>

        <main className="main-content">
          {status === 'loading' && <LoadingSpinner message="Checking registration status..." />}
          
          {status === 'register' && (
            <RegistrationForm 
              onSuccess={handleRegistrationSuccess}
              onError={handleRegistrationError}
            />
          )}
          
          {status === 'pending' && (
            <PendingStatus 
              user={userData}
              onRefresh={checkStatus}
            />
          )}
          
          {status === 'approved' && (
            <SuccessMessage user={userData} />
          )}
          
          {status === 'rejected' && (
            <ErrorMessage 
              title="Registration Rejected"
              message="Your registration has been rejected by an administrator. Please contact support if you believe this is a mistake."
              showRetry={false}
            />
          )}
          
          {status === 'error' && (
            <ErrorMessage 
              title="Registration Failed"
              message={error}
              onRetry={handleRetry}
              showRetry={true}
            />
          )}
        </main>

        <footer className="footer">
          <p>© 2024 AriesxHit. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
