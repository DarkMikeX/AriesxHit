import React, { useState, useEffect } from 'react';
import { generateFingerprint } from '../utils/fingerprint';
import { registerUser } from '../utils/api';
import { validateUsername, validateEmail, validateTelegram } from '../utils/validators';
import LoadingSpinner from './LoadingSpinner';
import FingerprintCollector from './FingerprintCollector';

function RegistrationForm({ onSuccess, onError }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    telegram: ''
  });
  const [errors, setErrors] = useState({});
  const [fingerprint, setFingerprint] = useState(null);
  const [fingerprintReady, setFingerprintReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1 = form, 2 = fingerprint

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    if (formData.telegram) {
      const telegramError = validateTelegram(formData.telegram);
      if (telegramError) newErrors.telegram = telegramError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setStep(2);
    }
  };

  const handleFingerprintReady = (fp) => {
    setFingerprint(fp);
    setFingerprintReady(true);
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    if (!fingerprint) {
      onError('Fingerprint collection failed. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting registration:', {
        username: formData.username,
        email: formData.email,
        fingerprintLength: fingerprint?.length
      });

      const result = await registerUser({
        username: formData.username,
        email: formData.email,
        telegram: formData.telegram || null,
        fingerprint: fingerprint
      });

      console.log('Registration result:', result);

      if (result.success) {
        onSuccess(result.user, fingerprint);
      } else {
        // Pass rate limit info if available
        const errorData = {
          message: result.message || 'Registration failed. Please check your information and try again.',
          isRateLimited: result.isRateLimited || false,
          retryAfter: result.retryAfter || null,
          errors: result.errors || null
        };
        console.error('Registration failed:', errorData);
        onError(errorData);
      }
    } catch (err) {
      console.error('Registration error:', err);
      onError({
        message: err.message || 'Network error. Please check your connection and try again.',
        isRateLimited: false,
        retryAfter: null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-card">
      <div className="card-header">
        <h2>Register Your Device</h2>
        <p>Complete the form below to request access</p>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Info</span>
        </div>
        <div className="step-line"></div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Verify</span>
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={handleContinue} className="registration-form">
          <div className="form-group">
            <label htmlFor="username">
              <span className="label-icon">👤</span>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              className={errors.username ? 'error' : ''}
              autoComplete="off"
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <span className="label-icon">📧</span>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={errors.email ? 'error' : ''}
              autoComplete="off"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="telegram">
              <span className="label-icon">✈️</span>
              Telegram Username <span className="optional">(optional)</span>
            </label>
            <input
              type="text"
              id="telegram"
              name="telegram"
              value={formData.telegram}
              onChange={handleChange}
              placeholder="@username"
              className={errors.telegram ? 'error' : ''}
              autoComplete="off"
            />
            {errors.telegram && <span className="error-text">{errors.telegram}</span>}
          </div>

          <button type="submit" className="btn btn-primary">
            Continue
            <span className="btn-icon">→</span>
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="fingerprint-step">
          <FingerprintCollector onReady={handleFingerprintReady} />
          
          <div className="step-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              ← Back
            </button>
            
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!fingerprintReady || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner small />
                  Registering...
                </>
              ) : (
                <>
                  Complete Registration
                  <span className="btn-icon">✓</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistrationForm;
