// ===================================
// EMAILSERVICE.JS
// Email Service (Future Implementation)
// ===================================

/**
 * Email Service
 * 
 * This service is a placeholder for future email functionality.
 * Can be used for:
 * - User registration notifications
 * - Password reset emails
 * - Admin notifications for new registrations
 * - Account status change notifications
 * 
 * To implement, configure SMTP settings in .env:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 */

class EmailService {
  constructor() {
    this.configured = false;
    this.transporter = null;

    // Check if email is configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.configure();
    }
  }

  /**
   * Configure email transporter
   */
  configure() {
    try {
      // Uncomment when implementing email
      // const nodemailer = require('nodemailer');
      // 
      // this.transporter = nodemailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: process.env.SMTP_PORT || 587,
      //   secure: process.env.SMTP_SECURE === 'true',
      //   auth: {
      //     user: process.env.SMTP_USER,
      //     pass: process.env.SMTP_PASS
      //   }
      // });
      // 
      // this.configured = true;
      // console.log('✅ Email service configured');

      console.log('📧 Email service not implemented yet');
    } catch (error) {
      console.error('❌ Failed to configure email service:', error.message);
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   */
  async send({ to, subject, text, html }) {
    if (!this.configured) {
      console.log(`📧 [Email not sent] To: ${to}, Subject: ${subject}`);
      return { sent: false, reason: 'Email service not configured' };
    }

    try {
      // const result = await this.transporter.sendMail({
      //   from: process.env.SMTP_FROM || process.env.SMTP_USER,
      //   to,
      //   subject,
      //   text,
      //   html
      // });
      // 
      // return { sent: true, messageId: result.messageId };

      return { sent: false, reason: 'Not implemented' };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return { sent: false, reason: error.message };
    }
  }

  /**
   * Send registration notification to admin
   * @param {Object} user - Registered user
   */
  async sendRegistrationNotification(user) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    return this.send({
      to: adminEmail,
      subject: `[AriesxHit] New User Registration: ${user.username}`,
      text: `A new user has registered and is waiting for approval.\n\nUsername: ${user.username}\nRegistered: ${new Date().toISOString()}`,
      html: `
        <h2>New User Registration</h2>
        <p>A new user has registered and is waiting for approval.</p>
        <table>
          <tr><td><strong>Username:</strong></td><td>${user.username}</td></tr>
          <tr><td><strong>Registered:</strong></td><td>${new Date().toISOString()}</td></tr>
        </table>
        <p><a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3001'}">Go to Admin Panel</a></p>
      `
    });
  }

  /**
   * Send approval notification to user
   * @param {Object} user - Approved user
   * @param {string} email - User's email (if collected)
   */
  async sendApprovalNotification(user, email) {
    if (!email) return;

    return this.send({
      to: email,
      subject: '[AriesxHit] Your Account Has Been Approved',
      text: `Congratulations! Your AriesxHit account has been approved.\n\nUsername: ${user.username}\n\nYou can now login to the extension with your credentials.`,
      html: `
        <h2>Account Approved!</h2>
        <p>Congratulations! Your AriesxHit account has been approved.</p>
        <p><strong>Username:</strong> ${user.username}</p>
        <p>You can now login to the extension with your credentials.</p>
      `
    });
  }

  /**
   * Send block notification to user
   * @param {Object} user - Blocked user
   * @param {string} email - User's email (if collected)
   * @param {string} reason - Block reason
   */
  async sendBlockNotification(user, email, reason) {
    if (!email) return;

    return this.send({
      to: email,
      subject: '[AriesxHit] Your Account Has Been Blocked',
      text: `Your AriesxHit account has been blocked.\n\nUsername: ${user.username}\nReason: ${reason || 'No reason provided'}\n\nIf you believe this is a mistake, please contact support.`,
      html: `
        <h2>Account Blocked</h2>
        <p>Your AriesxHit account has been blocked.</p>
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
        <p>If you believe this is a mistake, please contact support.</p>
      `
    });
  }
}

// Export singleton instance
module.exports = new EmailService();
