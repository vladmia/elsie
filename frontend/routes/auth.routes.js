const express = require('express');
const router = express.Router();
const axios = require('axios');
const { isLoggedIn, isLoggedOut } = require('../middleware/auth');

// API base URL
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Login page
router.get('/login', isLoggedOut, (req, res) => {
  const { verified } = req.query;
  
  if (verified === 'true') {
    req.flash('success_msg', 'Email verified successfully! You can now log in.');
  } else if (verified === 'false') {
    req.flash('error_msg', 'Email verification failed. Please try again.');
  }
  
  res.render('auth/login', { 
    title: 'Login',
    error: req.flash('error')
  });
});

// Register page
router.get('/register', isLoggedOut, (req, res) => {
  res.render('auth/register', { 
    title: 'Register',
    error: req.flash('error')
  });
});

// Handle login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      // Store user info in session
      req.session.user = response.data.user;
      req.session.token = response.data.access_token;
      
      // Redirect based on user role
      if (req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
      } else if (req.session.user.role === 'farmer') {
        return res.redirect('/farmer/dashboard');
      } else {
        return res.redirect('/vendor/dashboard');
      }
    } else {
      req.flash('error_msg', 'Invalid credentials');
      res.redirect('/auth/login');
    }
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    
    // Check if error is due to unverified email
    if (error.response?.status === 401 && error.response?.data?.message?.includes('verify your email')) {
      req.flash('error_msg', 'Please verify your email before logging in.');
    } else {
      req.flash('error_msg', error.response?.data?.message || 'Login failed');
    }
    
    res.redirect('/auth/login');
  }
});

// Handle register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phoneNumber } = req.body;
    
    if (!name || !email || !password) {
      req.flash('error_msg', 'Please fill all required fields');
      return res.redirect('/auth/register');
    }
    
    const response = await axios.post(`${API_URL}/auth/register`, {
      name,
      email,
      password,
      role,
      phoneNumber
    });
    
    if (response.data.success) {
      // Set success message and redirect to login
      req.flash('success_msg', 'Registration successful! You can now log in.');
      return res.redirect('/auth/login');
    } else {
      req.flash('error_msg', 'Registration failed');
      res.redirect('/auth/register');
    }
  } catch (error) {
    console.error('Register error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Registration failed');
    res.redirect('/auth/register');
  }
});

// Handle logout
router.get('/logout', isLoggedIn, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

// Forgot password page
router.get('/forgot-password', isLoggedOut, (req, res) => {
  res.render('auth/forgot-password', { 
    title: 'Forgot Password',
    error: req.flash('error')
  });
});

// Handle forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      req.flash('error_msg', 'Please provide an email');
      return res.redirect('/auth/forgot-password');
    }
    
    const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
    
    if (response.data.success) {
      req.flash('success_msg', 'Password reset email sent. Check your inbox.');
      res.redirect('/auth/login');
    } else {
      req.flash('error_msg', 'Failed to send reset email');
      res.redirect('/auth/forgot-password');
    }
  } catch (error) {
    console.error('Forgot password error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to process request');
    res.redirect('/auth/forgot-password');
  }
});

// Reset password page
router.get('/reset-password', isLoggedOut, (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    req.flash('error_msg', 'Invalid reset token');
    return res.redirect('/auth/login');
  }
  
  res.render('auth/reset-password', { 
    title: 'Reset Password',
    token,
    error: req.flash('error')
  });
});

// Handle reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      req.flash('error_msg', 'Missing token or password');
      return res.redirect('/auth/login');
    }
    
    const response = await axios.post(`${API_URL}/auth/reset-password`, { 
      token,
      password
    });
    
    if (response.data.success) {
      req.flash('success_msg', 'Password reset successful. Please log in.');
      res.redirect('/auth/login');
    } else {
      req.flash('error_msg', 'Password reset failed');
      res.redirect(`/auth/reset-password?token=${token}`);
    }
  } catch (error) {
    console.error('Reset password error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to reset password');
    res.redirect('/auth/login');
  }
});

// Google OAuth URL endpoint
router.get('/google-url', (req, res) => {
  // Add state parameter to verify the callback
  const state = Math.random().toString(36).substring(2, 15);
  req.session.oauthState = state;
  
  // Create redirect URI back to this frontend
  const redirectUri = encodeURIComponent(`${req.protocol}://${req.get('host')}/auth/google/callback`);
  
  // Fetch the URL from the backend
  axios.get(`${API_URL}/auth/google?redirect_uri=${redirectUri}&state=${state}`)
    .then(response => {
      res.json({ url: response.data.url });
    })
    .catch(error => {
      console.error('Error fetching Google auth URL:', error);
      res.status(500).json({ error: 'Failed to get authentication URL' });
    });
});

// Direct Google OAuth login (redirects to backend)
router.get('/google', (req, res) => {
  // Let the client-side JavaScript handle this
  res.render('auth/login');
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { token, user, error } = req.query;
    
    if (error) {
      req.flash('error_msg', `Authentication failed: ${error}`);
      return res.redirect('/auth/login');
    }
    
    if (!token || !user) {
      req.flash('error_msg', 'Authentication failed: Missing token or user data');
      return res.redirect('/auth/login');
    }
    
    try {
      // Parse user data
      const userData = JSON.parse(Buffer.from(user, 'base64').toString('utf-8'));
      
      // Check if the user has a role already (existing user)
      if (userData.role === 'admin' || userData.role === 'farmer' || userData.role === 'vendor') {
        // Store session data for existing user
        req.session.user = userData;
        req.session.token = token;
        
        req.flash('success_msg', 'Successfully logged in with Google');
        
        // Redirect based on user role
        if (userData.role === 'admin') {
          return res.redirect('/admin/dashboard');
        } else if (userData.role === 'farmer') {
          return res.redirect('/farmer/dashboard');
        } else {
          return res.redirect('/vendor/dashboard');
        }
      } else {
        // New user, needs to select a role
        // Render role selection page with Google data
        return res.render('auth/role-selection', {
          title: 'Select Account Type',
          google_token: token,
          google_user: user
        });
      }
    } catch (parseError) {
      console.error('Error parsing user data:', parseError);
      req.flash('error_msg', 'Failed to process authentication data');
      res.redirect('/auth/login');
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    req.flash('error_msg', 'Authentication failed');
    res.redirect('/auth/login');
  }
});

// Google OAuth role selection
router.post('/google/role', async (req, res) => {
  try {
    const { google_token, google_user, role } = req.body;
    
    if (!google_token || !google_user || !role) {
      req.flash('error_msg', 'Missing required data');
      return res.redirect('/auth/login');
    }
    
    // Parse user data
    const userData = JSON.parse(Buffer.from(google_user, 'base64').toString('utf-8'));
    
    // Update user role in the backend
    const response = await axios.post(`${API_URL}/auth/update-role`, {
      userId: userData.id,
      role
    }, {
      headers: {
        Authorization: `Bearer ${google_token}`
      }
    });
    
    if (response.data.success) {
      // Update user data with new role
      const updatedUserData = {
        ...userData,
        role
      };
      
      // Store in session
      req.session.user = updatedUserData;
      req.session.token = google_token;
      
      req.flash('success_msg', 'Registration completed successfully');
      
      // Redirect based on new role
      if (role === 'farmer') {
        return res.redirect('/farmer/dashboard');
      } else {
        return res.redirect('/vendor/dashboard');
      }
    } else {
      req.flash('error_msg', response.data.message || 'Failed to update role');
      return res.redirect('/auth/login');
    }
  } catch (error) {
    console.error('Role update error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to update role');
    res.redirect('/auth/login');
  }
});

// Profile page
router.get('/profile', isLoggedIn, async (req, res) => {
  try {
    // Get updated user data from the API
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${req.session.token}`
      }
    });
    
    if (response.data.success) {
      // Update session user data with the latest from the API
      req.session.user = response.data.data;
      
      res.render('auth/profile', { 
        title: 'My Profile',
        user: req.session.user
      });
    } else {
      req.flash('error_msg', 'Failed to load profile data');
      res.redirect('/');
    }
  } catch (error) {
    console.error('Profile error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to load profile');
    res.redirect('/');
  }
});

// Update phone number
router.post('/update-phone', isLoggedIn, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Call API to update phone number
    const response = await axios.post(`${API_URL}/auth/update-phone`, 
      { phoneNumber },
      {
        headers: {
          Authorization: `Bearer ${req.session.token}`
        }
      }
    );
    
    if (response.data.success) {
      // Update session user data
      req.session.user.phone_number = response.data.data.phone_number;
      
      req.flash('success_msg', 'Phone number updated successfully');
    } else {
      req.flash('error_msg', 'Failed to update phone number');
    }
    
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Update phone error:', error.response?.data || error.message);
    req.flash('error_msg', error.response?.data?.message || 'Failed to update phone number');
    res.redirect('/auth/profile');
  }
});

module.exports = router; 