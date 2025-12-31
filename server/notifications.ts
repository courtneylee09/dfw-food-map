import nodemailer from 'nodemailer';
import type { Submission } from '@shared/schema';

// Email notification service
export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private adminEmail: string;

  constructor() {
    this.adminEmail = process.env.ADMIN_EMAIL || '';
    
    // Set up email transporter if credentials are provided
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const port = parseInt(process.env.SMTP_PORT || '587');
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: secure, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Additional options for HostGator compatibility
        tls: {
          rejectUnauthorized: false, // Some shared hosts have self-signed certs
        },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      // Gmail setup (easier for most users)
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      this.adminEmail = process.env.GMAIL_USER;
    }
  }

  async sendSubmissionNotification(submission: Submission): Promise<boolean> {
    if (!this.transporter || !this.adminEmail) {
      console.warn('⚠️  Email notifications not configured. Set ADMIN_EMAIL and email credentials in .env');
      return false;
    }

    try {
      const mailOptions = {
        from: `"DFW Food Map" <${this.transporter.options.auth?.user}>`,
        to: this.adminEmail,
        subject: `New Food Resource Submission: ${submission.name}`,
        html: `
          <h2>New Food Resource Submission</h2>
          <p>A new food resource has been submitted to your map:</p>
          
          <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Name:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${submission.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Type:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${submission.type}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Address:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${submission.address}</td>
            </tr>
            ${submission.hours ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Hours:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${submission.hours}</td>
            </tr>
            ` : ''}
            ${submission.phone ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Phone:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${submission.phone}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Appointment Required:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${submission.appointmentRequired ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #f5f5f5;">Submitted:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date(submission.submittedAt).toLocaleString()}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px;">
            <a href="${process.env.APP_URL || 'http://localhost:5000'}/admin/submissions" 
               style="background: #114121; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View All Submissions
            </a>
          </p>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from your DFW Food Map application.
          </p>
        `,
        text: `
New Food Resource Submission

Name: ${submission.name}
Type: ${submission.type}
Address: ${submission.address}
${submission.hours ? `Hours: ${submission.hours}` : ''}
${submission.phone ? `Phone: ${submission.phone}` : ''}
Appointment Required: ${submission.appointmentRequired ? 'Yes' : 'No'}
Submitted: ${new Date(submission.submittedAt).toLocaleString()}

View at: ${process.env.APP_URL || 'http://localhost:5000'}/admin/submissions
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email notification sent for submission: ${submission.name}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send email notification:', error.message);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.adminEmail !== '';
  }
}

export const notificationService = new NotificationService();

