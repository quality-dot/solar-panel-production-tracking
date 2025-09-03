// Email service for manufacturing system notifications
// Handles password reset emails and other system notifications

import nodemailer from 'nodemailer';
import { manufacturingLogger } from '../middleware/logger.js';
import { config } from '../config/environment.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      // For development/testing, use a mock transporter
      if (config.environment === 'development' || config.environment === 'test') {
        this.transporter = this.createMockTransporter();
        this.isConfigured = true;
        manufacturingLogger.info('Email service initialized with mock transporter', {
          environment: config.environment
        });
        return;
      }

      // For production, configure real SMTP
      if (config.email?.smtp) {
        this.transporter = nodemailer.createTransporter({
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          secure: config.email.smtp.secure,
          auth: {
            user: config.email.smtp.user,
            pass: config.email.smtp.password
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        this.isConfigured = true;
        manufacturingLogger.info('Email service initialized with SMTP transporter', {
          host: config.email.smtp.host,
          port: config.email.smtp.port
        });
      } else {
        // Fallback to mock if no SMTP config
        this.transporter = this.createMockTransporter();
        this.isConfigured = true;
        manufacturingLogger.warn('No SMTP configuration found, using mock transporter');
      }
    } catch (error) {
      manufacturingLogger.error('Failed to initialize email service', {
        error: error.message
      });
      this.transporter = this.createMockTransporter();
      this.isConfigured = true;
    }
  }

  /**
   * Create mock transporter for development/testing
   */
  createMockTransporter() {
    return {
      sendMail: async (mailOptions) => {
        manufacturingLogger.info('Mock email sent', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          category: 'email_mock'
        });
        
        // In development, log the email content
        if (config.environment === 'development') {
          console.log('\n📧 EMAIL SENT:');
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Content: ${mailOptions.text || mailOptions.html}`);
          console.log('---\n');
        }
        
        return { messageId: 'mock-' + Date.now() };
      }
    };
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Password reset token
   * @param {string} username - Username for personalization
   */
  async sendPasswordResetEmail(email, resetToken, username) {
    try {
      const resetUrl = `${config.frontend?.url || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: config.email?.from || 'noreply@manufacturing.com',
        to: email,
        subject: 'Password Reset Request - Manufacturing System',
        html: this.generatePasswordResetHTML(username, resetUrl),
        text: this.generatePasswordResetText(username, resetUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      manufacturingLogger.info('Password reset email sent', {
        email,
        username,
        messageId: result.messageId,
        category: 'password_reset'
      });

      return result;
    } catch (error) {
      manufacturingLogger.error('Failed to send password reset email', {
        error: error.message,
        email,
        username
      });
      throw error;
    }
  }

  /**
   * Send account unlock notification email
   * @param {string} email - Recipient email
   * @param {string} username - Username
   * @param {string} unlockReason - Reason for unlock
   */
  async sendAccountUnlockEmail(email, username, unlockReason) {
    try {
      const mailOptions = {
        from: config.email?.from || 'noreply@manufacturing.com',
        to: email,
        subject: 'Account Unlocked - Manufacturing System',
        html: this.generateAccountUnlockHTML(username, unlockReason),
        text: this.generateAccountUnlockText(username, unlockReason)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      manufacturingLogger.info('Account unlock email sent', {
        email,
        username,
        unlockReason,
        messageId: result.messageId,
        category: 'account_unlock'
      });

      return result;
    } catch (error) {
      manufacturingLogger.error('Failed to send account unlock email', {
        error: error.message,
        email,
        username
      });
      throw error;
    }
  }

  /**
   * Generate HTML content for password reset email
   */
  generatePasswordResetHTML(username, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Manufacturing System</h1>
            <h2>Password Reset Request</h2>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>We received a request to reset your password for the Manufacturing System account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email.
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Manufacturing System. Please do not reply to this email.</p>
            <p>© 2024 Manufacturing System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for password reset email
   */
  generatePasswordResetText(username, resetUrl) {
    return `
Manufacturing System - Password Reset Request

Hello ${username},

We received a request to reset your password for the Manufacturing System account.

To reset your password, please visit the following link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

---
This is an automated message from the Manufacturing System.
Please do not reply to this email.

© 2024 Manufacturing System. All rights reserved.
    `.trim();
  }

  /**
   * Generate HTML content for account unlock email
   */
  generateAccountUnlockHTML(username, unlockReason) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Unlocked</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Manufacturing System</h1>
            <h2>Account Unlocked</h2>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Your Manufacturing System account has been unlocked.</p>
            <p><strong>Reason:</strong> ${unlockReason}</p>
            <p>You can now log in to the system normally.</p>
            <p>If you have any questions or concerns, please contact your system administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Manufacturing System.</p>
            <p>© 2024 Manufacturing System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for account unlock email
   */
  generateAccountUnlockText(username, unlockReason) {
    return `
Manufacturing System - Account Unlocked

Hello ${username},

Your Manufacturing System account has been unlocked.

Reason: ${unlockReason}

You can now log in to the system normally.

If you have any questions or concerns, please contact your system administrator.

---
This is an automated message from the Manufacturing System.

© 2024 Manufacturing System. All rights reserved.
    `.trim();
  }

  /**
   * Send account lockout notification email
   * @param {string} email - Recipient email
   * @param {string} username - Username
   * @param {Date} lockoutUntil - Lockout expiration time
   * @param {number} attemptCount - Number of failed attempts
   */
  async sendAccountLockoutEmail(email, username, lockoutUntil, attemptCount) {
    try {
      const mailOptions = {
        from: config.email?.from || 'noreply@manufacturing.com',
        to: email,
        subject: 'Account Locked - Manufacturing System',
        html: this.generateAccountLockoutHTML(username, lockoutUntil, attemptCount),
        text: this.generateAccountLockoutText(username, lockoutUntil, attemptCount)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      manufacturingLogger.info('Account lockout email sent', {
        email,
        username,
        lockoutUntil,
        attemptCount,
        messageId: result.messageId,
        category: 'account_lockout'
      });

      return result;
    } catch (error) {
      manufacturingLogger.error('Failed to send account lockout email', {
        error: error.message,
        email,
        username,
        category: 'account_lockout'
      });
      throw error;
    }
  }

  /**
   * Generate HTML content for account lockout email
   */
  generateAccountLockoutHTML(username, lockoutUntil, attemptCount) {
    const lockoutTime = lockoutUntil.toLocaleString();
    const lockoutDuration = Math.ceil((lockoutUntil.getTime() - new Date().getTime()) / (1000 * 60));
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Locked</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Manufacturing System</h1>
            <h2>Account Locked</h2>
          </div>
          <div class="content">
            <p>Hello ${username},</p>
            <p>Your Manufacturing System account has been temporarily locked due to multiple failed login attempts.</p>
            
            <div class="warning">
              <strong>Security Alert:</strong> Your account was locked after ${attemptCount} failed login attempts.
            </div>
            
            <div class="info">
              <strong>Lockout Details:</strong><br>
              • Lockout Duration: ${lockoutDuration} minutes<br>
              • Lockout Expires: ${lockoutTime}<br>
              • Reason: Multiple failed login attempts
            </div>
            
            <p><strong>What to do:</strong></p>
            <ul>
              <li>Wait for the lockout period to expire (${lockoutDuration} minutes)</li>
              <li>Ensure you're using the correct username and password</li>
              <li>Contact your system administrator if you need immediate access</li>
              <li>Consider using the password reset feature if you've forgotten your password</li>
            </ul>
            
            <p><strong>Security Tips:</strong></p>
            <ul>
              <li>Use a strong, unique password</li>
              <li>Don't share your login credentials</li>
              <li>Log out when finished using the system</li>
              <li>Report any suspicious activity to your administrator</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated security message from the Manufacturing System.</p>
            <p>© 2024 Manufacturing System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for account lockout email
   */
  generateAccountLockoutText(username, lockoutUntil, attemptCount) {
    const lockoutTime = lockoutUntil.toLocaleString();
    const lockoutDuration = Math.ceil((lockoutUntil.getTime() - new Date().getTime()) / (1000 * 60));
    
    return `
Manufacturing System - Account Locked

Hello ${username},

Your Manufacturing System account has been temporarily locked due to multiple failed login attempts.

SECURITY ALERT: Your account was locked after ${attemptCount} failed login attempts.

LOCKOUT DETAILS:
• Lockout Duration: ${lockoutDuration} minutes
• Lockout Expires: ${lockoutTime}
• Reason: Multiple failed login attempts

WHAT TO DO:
• Wait for the lockout period to expire (${lockoutDuration} minutes)
• Ensure you're using the correct username and password
• Contact your system administrator if you need immediate access
• Consider using the password reset feature if you've forgotten your password

SECURITY TIPS:
• Use a strong, unique password
• Don't share your login credentials
• Log out when finished using the system
• Report any suspicious activity to your administrator

---
This is an automated security message from the Manufacturing System.

© 2024 Manufacturing System. All rights reserved.
    `.trim();
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      await this.transporter.verify();
      manufacturingLogger.info('Email service connection verified');
      return true;
    } catch (error) {
      manufacturingLogger.error('Email service connection failed', {
        error: error.message
      });
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
