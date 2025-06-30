const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.post('/google/exchange', authController.googleExchange);

// Protected routes
router.get('/me', protect, authController.getCurrentUser);
router.post('/update-password', protect, authController.updatePassword);
router.post('/update-phone', protect, authController.updatePhoneNumber);
router.post('/update-role', protect, authController.updateRole);

module.exports = router; 