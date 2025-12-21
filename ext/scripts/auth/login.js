// ===================================
// LOGIN.JS
// Login Page Authentication Handler
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check if already authenticated
  const isAuth = await Storage.isAuthenticated();
  if (isAuth) {
    // Already logged in, redirect to popup
    window.location.href = 'popup.html';
    return;
  }

  // Generate or get fingerprint
  const fingerprint = await Crypto.getOrCreateFingerprint();
  console.log('Device fingerprint generated:', fingerprint.substring(0, 16) + '...');

  // Elements
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const loginButton = document.getElementById('login-button');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const registerLink = document.getElementById('register-link');

  // Toggle password visibility
  togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    
    // Change icon
    const icon = togglePasswordBtn.querySelector('svg');
    if (type === 'text') {
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
    } else {
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
  });

  // Show error message
  function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }

  // Set loading state
  function setLoading(loading) {
    if (loading) {
      loginButton.classList.add('loading');
      loginButton.disabled = true;
      loginButton.querySelector('.button-text').style.display = 'none';
      loginButton.querySelector('.button-loader').style.display = 'inline-block';
      usernameInput.disabled = true;
      passwordInput.disabled = true;
    } else {
      loginButton.classList.remove('loading');
      loginButton.disabled = false;
      loginButton.querySelector('.button-text').style.display = 'inline';
      loginButton.querySelector('.button-loader').style.display = 'none';
      usernameInput.disabled = false;
      passwordInput.disabled = false;
    }
  }

  // Handle form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Validate inputs
    const usernameValidation = Validators.validateUsername(username);
    if (!usernameValidation.valid) {
      showError(usernameValidation.error);
      return;
    }

    const passwordValidation = Validators.validatePassword(password);
    if (!passwordValidation.valid) {
      showError(passwordValidation.error);
      return;
    }

    setLoading(true);

    try {
      // Call login API
      const response = await APIClient.login(username, password, fingerprint);

      // Store auth data
      await Storage.setToken(response.token);
      await Storage.setUserData(response.user);
      await Storage.setPermissions(response.permissions);

      // Show success (optional, since we're redirecting)
      console.log('Login successful!');

      // Redirect to popup
      setTimeout(() => {
        window.location.href = 'popup.html';
      }, 500);

    } catch (error) {
      console.error('Login error:', error);

      let errorMsg = CONFIG.MESSAGES.AUTH.LOGIN_FAILED;

      if (error.status === 401) {
        errorMsg = 'Invalid username or password';
      } else if (error.status === 403) {
        if (error.data && error.data.reason === 'fingerprint_mismatch') {
          errorMsg = CONFIG.MESSAGES.AUTH.FINGERPRINT_MISMATCH;
        } else if (error.data && error.data.reason === 'account_pending') {
          errorMsg = 'Your account is pending approval';
        } else if (error.data && error.data.reason === 'account_blocked') {
          errorMsg = 'Your account has been blocked';
        } else {
          errorMsg = 'Access denied';
        }
      } else if (error.status === 0) {
        errorMsg = CONFIG.MESSAGES.ERROR.NETWORK;
      } else if (error.message) {
        errorMsg = error.message;
      }

      showError(errorMsg);
      setLoading(false);
    }
  });

  // Register link
  registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Open registration site in new tab
    chrome.tabs.create({ 
      url: 'https://your-registration-site.com' // Replace with actual URL
    });
  });

  // Focus username input
  usernameInput.focus();
});