const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config/config.env') });

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'user@example.com',
      pass: process.env.EMAIL_PASS || 'password'
    }
  });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text content
 * @param {String} options.html - HTML content (optional)
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `FreshLink <${process.env.EMAIL_FROM || 'noreply@freshlink.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {String} email - User's email
 * @param {String} resetToken - Password reset token
 * @param {String} resetUrl - Frontend URL for password reset
 * @returns {Promise} - Resolves with info about the sent email
 */
const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  const resetLink = `${resetUrl}?token=${resetToken}`;
  
  const text = `
    You are receiving this email because you (or someone else) has requested to reset your password.
    Please click on the following link, or paste it into your browser to complete the process:
    ${resetLink}
    If you did not request this, please ignore this email and your password will remain unchanged.
  `;
  
  const html = `
    <p>You are receiving this email because you (or someone else) has requested to reset your password.</p>
    <p>Please click on the following link, or paste it into your browser to complete the process:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
  `;
  
  return sendEmail({
    to: email,
    subject: 'Password Reset - FreshLink',
    text,
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail
}; 