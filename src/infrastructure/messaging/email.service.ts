import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize transporter (e.g., using environment variables for SMTP)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: '"Compensation System" <no-reply@company.com>',
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: `<div style="font-family: Arial, sans-serif;"><h2>${options.subject}</h2><p>${options.body}</p></div>`,
      });

      this.logger.log(`Email successfully sent to ${options.to}. MessageId: ${info.messageId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${options.to}: ${message}`);
      throw new Error(`Email delivery failed: ${message}`);
    }
  }
}
