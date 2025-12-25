// ===================================
// VALIDATORS.JS
// Form Validation Functions
// ===================================

export function validateUsername(username) {
  if (!username || username.trim() === '') {
    return 'Username is required';
  }
  
  if (username.length < 3) {
    return 'Username must be at least 3 characters';
  }
  
  if (username.length > 30) {
    return 'Username must be less than 30 characters';
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  
  return null;
}

export function validateEmail(email) {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  if (email.length > 100) {
    return 'Email must be less than 100 characters';
  }
  
  return null;
}

export function validateTelegram(telegram) {
  if (!telegram || telegram.trim() === '') {
    return null; // Optional field
  }
  
  // Remove @ if present
  const cleanTelegram = telegram.startsWith('@') ? telegram.slice(1) : telegram;
  
  if (cleanTelegram.length < 5) {
    return 'Telegram username must be at least 5 characters';
  }
  
  if (cleanTelegram.length > 32) {
    return 'Telegram username must be less than 32 characters';
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(cleanTelegram)) {
    return 'Telegram username can only contain letters, numbers, and underscores';
  }
  
  return null;
}
