const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const { pool } = require('../config/db');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config/config.env') });

// Middleware to protect routes - verifies JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // If no token found, return error
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
      
      // Get user from database
      const [user] = await pool.query(
        'SELECT id, name, email, role, email_verified FROM users WHERE id = ?', 
        [decoded.id]
      );
      
      if (!user.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Add user to request object
      req.user = user[0];
      next();
      
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Middleware to restrict access based on user role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    next();
  };
}; 