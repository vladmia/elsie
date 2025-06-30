const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { generateToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/email');
const { exchangeCodeForTokens, getUserInfo, getAuthUrl } = require('../utils/oauth');
const { validatePhoneNumber, formatPhoneNumber } = require('../utils/phoneNumber');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config/config.env') });

// @desc    Register user
// @route   POST /auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phoneNumber } = req.body;
    
    // Check if required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }
    
    // Check if user already exists
    const [existingUser] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    // Validate phone number if provided
    let formattedPhoneNumber = null;
    if (phoneNumber) {
      if (!validatePhoneNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
      formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Determine user role (use the provided role or default to 'vendor')
    const userRole = role === 'farmer' ? 'farmer' : (role === 'vendor' ? 'vendor' : 'vendor');
    
    // Create user (email_verified set to true by default)
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role, email_verified, phone_number) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, userRole, true, formattedPhoneNumber]
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: result.insertId,
        name,
        email,
        role: userRole,
        email_verified: true,
        phone_number: formattedPhoneNumber
      }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Verify email
// @route   GET /auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }
    
    // Find user with the verification token
    const [users] = await pool.query(
      'SELECT * FROM users WHERE verification_token = ?',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }
    
    // Update user to mark email as verified and clear verification token
    await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = ?',
      [users[0].id]
    );
    
    // Get frontend URL from environment variables
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    
    // Redirect to frontend with success message
    res.redirect(`${frontendUrl}/auth/login?verified=true`);
    
  } catch (error) {
    console.error('Email verification error:', error);
    
    // Get frontend URL from environment variables
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    
    // Redirect to frontend with error message
    res.redirect(`${frontendUrl}/auth/login?verified=false`);
  }
};

// @desc    Login user
// @route   POST /auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const user = users[0];
    
    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
        phone_number: user.phone_number
      },
      access_token: token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get current user
// @route   GET /auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, email_verified, phone_number FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role,
        email_verified: users[0].email_verified,
        phone_number: users[0].phone_number
      }
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Forgot password
// @route   POST /auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email'
      });
    }
    
    // Check if user exists
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token expiry (10 minutes)
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 10);
    
    // Save to database
    await pool.query(
      'UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?',
      [resetToken, resetExpires, email]
    );
    
    // Get frontend URL from environment variables
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetUrl = `${frontendUrl}/reset-password`;
    
    try {
      // Send password reset email
      await sendPasswordResetEmail(email, resetToken, resetUrl);
    
    res.status(200).json({
      success: true,
        message: 'Password reset email sent'
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // If email fails, clear the reset token
      await pool.query(
        'UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE email = ?',
        [email]
      );
      
      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset password
// @route   POST /auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password'
      });
    }
    
    // Find user with valid token
    const [users] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_expires > NOW()',
      [token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [hashedPassword, users[0].id]
    );
    
    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update password
// @route   POST /auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }
    
    // Get user with password
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get Google OAuth URL
// @route   GET /auth/google
// @access  Public
exports.googleAuth = (req, res) => {
  try {
    // Get frontend URL from query param or environment variable
    const frontendUrl = req.query.frontend_url || process.env.FRONTEND_URL || 'http://localhost:4000';
    
    // Create a state parameter that includes the frontend URL (base64 encoded)
    const stateData = {
      frontendUrl,
      timestamp: Date.now()
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    // Get the auth URL with state parameter
    const url = getAuthUrl(null, state);
    
    // Redirect directly to the Google OAuth page
    res.redirect(url);
  } catch (error) {
    console.error('Google auth URL error:', error);
    
    // Get frontend URL from query param or default
    const frontendUrl = req.query.frontend_url || process.env.FRONTEND_URL || 'http://localhost:4000';
    
    // Redirect to frontend with error
    res.redirect(`${frontendUrl}/auth/login?error=google_auth_failed`);
  }
};

// @desc    Google OAuth callback
// @route   GET /auth/google/callback
// @access  Public
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Default frontend URL
    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    
    // Try to extract frontend URL from state
    try {
      if (state) {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        if (stateData.frontendUrl) {
          frontendUrl = stateData.frontendUrl;
        }
      }
    } catch (stateError) {
      console.error('Error parsing state:', stateError);
      // Continue with default frontend URL
    }
    
    if (!code) {
      return res.redirect(`${frontendUrl}/auth/login?error=no_auth_code`);
    }
    
    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code);
    
    // Get user info from Google
    const googleUserInfo = await getUserInfo(tokenData.access_token);
    
    if (!googleUserInfo.email) {
      return res.redirect(`${frontendUrl}/auth/login?error=no_email`);
    }
    
    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [googleUserInfo.email]
    );
    
    let userId;
    let user;
    
    if (existingUsers.length > 0) {
      // User exists, use their ID
      user = existingUsers[0];
      userId = user.id;
    } else {
      // Create new user with Google info
      // Generate a random password (user won't need it as they'll login with Google)
      const randomPassword = crypto.randomBytes(20).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [googleUserInfo.name || 'Google User', googleUserInfo.email, hashedPassword]
      );
      
      userId = result.insertId;
      
      // Get the newly created user data
      const [newUsers] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (newUsers.length === 0) {
        return res.redirect(`${frontendUrl}/auth/login?error=user_creation_failed`);
      }
      
      user = newUsers[0];
    }
    
    // Generate JWT token
    const token = generateToken(userId);
    
    // Serialize user data for the redirect
    const encodedUser = Buffer.from(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })).toString('base64');
    
    // Redirect to frontend with token and user data
    res.redirect(`${frontendUrl}/auth/google/callback?token=${token}&user=${encodedUser}`);
    
  } catch (error) {
    console.error('Google callback error:', error);
    
    // Use default frontend URL if we can't get it from elsewhere
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    
    // Redirect to frontend with error
    res.redirect(`${frontendUrl}/auth/login?error=google_auth_failed`);
  }
};

// @desc    Exchange Google OAuth code for token and user data
// @route   POST /auth/google/exchange
// @access  Public
exports.googleExchange = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }
    
    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code);
    
    // Get user info from Google
    const googleUserInfo = await getUserInfo(tokenData.access_token);
    
    if (!googleUserInfo.email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Google'
      });
    }
    
    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [googleUserInfo.email]
    );
    
    let userId;
    let user;
    
    if (existingUsers.length > 0) {
      // User exists, use their ID and info
      user = existingUsers[0];
      userId = user.id;
    } else {
      // Create new user with Google info
      // Generate a random password (user won't need it as they'll login with Google)
      const randomPassword = crypto.randomBytes(20).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [googleUserInfo.name || 'Google User', googleUserInfo.email, hashedPassword]
      );
      
      userId = result.insertId;
      
      // Get the newly created user
      const [newUsers] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (newUsers.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create user'
        });
      }
      
      user = newUsers[0];
    }
    
    // Generate JWT token
    const token = generateToken(userId);
    
    // Return user data and token
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      access_token: token
    });
    
  } catch (error) {
    console.error('Google exchange error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate with Google'
    });
  }
};

// @desc    Update user role (for OAuth users)
// @route   POST /auth/update-role
// @access  Private
exports.updateRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    // Validate input
    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID and role'
      });
    }
    
    // Validate role
    const validRoles = ['user', 'farmer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    // Check if the user exists
    const [users] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update the user role
    await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );
    
    // Get updated user data
    const [updatedUsers] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [userId]
    );
    
    if (updatedUsers.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve updated user data'
      });
    }
    
    // Return success with updated user
    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      user: updatedUsers[0]
    });
    
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update phone number
// @route   POST /auth/update-phone
// @access  Private
exports.updatePhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Validate and format phone number if provided
    let formattedPhoneNumber = null;
    if (phoneNumber) {
      if (!validatePhoneNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
      formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    }
    
    // Update user's phone number
    await pool.query(
      'UPDATE users SET phone_number = ? WHERE id = ?',
      [formattedPhoneNumber, req.user.id]
    );
    
    // Get updated user data
    const [users] = await pool.query(
      'SELECT id, name, email, role, email_verified, phone_number FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Phone number updated successfully',
      data: {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role,
        email_verified: users[0].email_verified,
        phone_number: users[0].phone_number
      }
    });
    
  } catch (error) {
    console.error('Update phone number error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
