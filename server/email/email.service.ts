// import * as nodemailer from 'nodemailer';
// import * as dotenv from 'dotenv';

// dotenv.config();

// const emailUser = process.env.EMAIL_USER;
// const emailPassword = process.env.EMAIL_PASSWORD;

// if (!emailUser || !emailPassword) {
//   console.warn('⚠️  EMAIL_USER or EMAIL_PASSWORD not set in environment variables');
//   console.warn('   Email functionality will not work until these are configured.');
// } else {
//   console.log('✅ Email configuration loaded');
//   console.log(`   EMAIL_USER: ${emailUser}`);
//   console.log(`   EMAIL_PASSWORD: ${emailPassword ? '***' + emailPassword.slice(-4) : 'NOT SET'}`);
// }

// const transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 465,
//   secure: true,
//   auth: {
//     user: emailUser,
//     pass: emailPassword,
//   },
//   tls: {
//     rejectUnauthorized: false,
//   },
//   // requireTLS: !emailSecure && emailPort === 587,
//   connectionTimeout: 15000,
//   greetingTimeout: 10000,
//   socketTimeout: 15000,
// } as nodemailer.TransportOptions);

// console.log(`📧 Email transporter configured:`);
// console.log(`   Auth user: ${emailUser}`);

// transporter.verify(function (error, success) {
//   if (error) {
//     console.error('❌ Email transporter verification failed:', error);
//     const errorDetails = error as any;
//     console.error('   Error details:', {
//       code: errorDetails.code,
//       command: errorDetails.command,
//       response: errorDetails.response,
//       responseCode: errorDetails.responseCode,
//     });
//     console.error('');
//     console.error('   Since port 587 is reachable, this might be due to:');
//     console.error('   1. Incorrect EMAIL_USER or EMAIL_PASSWORD');
//     console.error('   2. Gmail App Password is incorrect (not regular password)');
//     console.error('   3. Gmail account security settings blocking the connection');
//     console.error('   4. 2-Step Verification not enabled');
//     console.error('');
//     console.error('   Troubleshooting:');
//     console.error('   - Verify EMAIL_USER matches your Gmail address exactly');
//     console.error('   - Generate a NEW Gmail App Password');
//     console.error('   - Ensure 2-Step Verification is enabled on your Google Account');
//     console.error('   - Check Google Account security settings for blocked apps');
//   } else {
//     console.log('✅ Email transporter is ready to send emails');
//   }
// });

// class EmailService {
//   private async testConnection(host: string, port: number): Promise<boolean> {
//     return new Promise((resolve) => {
//       const net = require('net');
//       const socket = new net.Socket();
//       let connected = false;

//       socket.setTimeout(5000);
      
//       socket.once('connect', () => {
//         connected = true;
//         socket.destroy();
//         resolve(true);
//       });

//       socket.once('timeout', () => {
//         socket.destroy();
//         resolve(false);
//       });

//       socket.once('error', () => {
//         resolve(false);
//       });

//       socket.connect(port, host);
//     });
//   }

//   // private createTransporter(port: number, secure: boolean) {
//   //   return nodemailer.createTransport({
//   //     host: 'smtp.gmail.com',
//   //     port: port,
//   //     secure: secure,
//   //     auth: {
//   //       user: emailUser,
//   //       pass: emailPassword,
//   //     },
//   //     tls: {
//   //       rejectUnauthorized: false,
//   //     },
//   //     requireTLS: !secure && port === 587,
//   //     connectionTimeout: 20000,
//   //     greetingTimeout: 15000,
//   //     socketTimeout: 20000,
//   //   } as nodemailer.TransportOptions);
//   // }

//   async sendEmail(to: string, subject: string, text: string, html?: string, options?: { retries?: number; throwOnError?: boolean }) {
//     const maxRetries = options?.retries ?? 2;
//     const throwOnError = options?.throwOnError ?? false;
    
//     if (!emailUser || !emailPassword) {
//       const errorMsg = 'Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file';
//       console.warn(`⚠️  ${errorMsg}`);
//       if (throwOnError) {
//         throw new Error(errorMsg);
//       }
//       return null;
//     }

//     const mailOptions = {
//       from: emailUser,
//       to,
//       subject,
//       text,
//       html: html || text,
//     };

//     console.log(`📧 Attempting to send email to: ${to}`);
//     console.log(`   Subject: ${subject}`);

//     // console.log(`   Testing network connectivity to ${emailHost}...`);
//     // const canConnect587 = await this.testConnection(emailHost, 587);
//     // const canConnect465 = await this.testConnection(emailHost, 465);
    
//     // console.log(`   Port 587 connectivity: ${canConnect587 ? '✅ Reachable' : '❌ Blocked/Unreachable'}`);
//     // console.log(`   Port 465 connectivity: ${canConnect465 ? '✅ Reachable' : '❌ Blocked/Unreachable'}`);
    
//     // if (!canConnect587 && !canConnect465) {
//     //   // const errorMsg = `❌ CRITICAL: Cannot reach ${emailHost} on ports 587 or 465. This indicates:\n` +
//     //     `   1. Firewall/Antivirus is blocking SMTP connections\n` +
//     //     `   2. Your ISP/Network is blocking SMTP ports\n` +
//     //     `   3. VPN or proxy is interfering\n` +
//     //     `   Solution: Check firewall settings, try different network, or use alternative email service\n` +
//     //     `   NOTE: Email cannot be sent. Check server logs for OTP codes or contact administrator.`;
//     //   // console.error(errorMsg);
//     //   if (throwOnError) {
//     //     throw new Error('SMTP ports are blocked. Check firewall/network settings.');
//     //   }
//     //   return null;
//     // }

//     let lastError: any = null;
//     let currentTransporter = transporter;
//     let triedPort465 = false;
    
//     // // const startPort = canConnect465 && !canConnect587 ? 465 : emailPort;
//     // if (startPort === 465 && emailPort !== 465) {
//     //   console.log(`   ⚠️  Port 587 is blocked. Using port 465 instead...`);
//     //   currentTransporter = this.createTransporter(465, true);
//     //   triedPort465 = true;
//     // }
    
//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//       try {
//         if (attempt > 1) {
//           console.log(`   Retry attempt ${attempt} of ${maxRetries}...`);
//           await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
//         }

//         // if (attempt === 2 && !triedPort465 && emailPort === 587 && lastError?.code === 'ETIMEDOUT' && canConnect465) {
//         //   console.log('   ⚠️  Port 587 timed out. Trying port 465 with SSL as fallback...');
//         //   currentTransporter = this.createTransporter(465, true);
//         //   triedPort465 = true;
//         // }

//         const info = await currentTransporter.sendMail(mailOptions);
        
//         console.log(`✅ Email sent successfully!`);
//         console.log(`   Message ID: ${info.messageId}`);
//         if (info.response) {
//           console.log(`   Response: ${info.response}`);
//         }
        
//         return info;
//       } catch (error: any) {
//         lastError = error;
//         const errorCode = error.code || 'UNKNOWN';
//         const errorMessage = error.message || 'Unknown error';
        
//         console.error(`❌ Email send attempt ${attempt} failed:`);
//         console.error(`   Error: ${errorMessage}`);
//         console.error(`   Code: ${errorCode}`);
        
//         if (errorCode === 'EAUTH' || errorCode === 'EENVELOPE') {
//           console.error('   Authentication error - not retrying');
//           break;
//         }
        
//         if (attempt === maxRetries && (errorCode === 'ETIMEDOUT' || errorCode === 'ESOCKET')) {
//           console.error('   Connection timeout - all retry attempts exhausted');
//           console.error('');
//           console.error('   ⚠️  TROUBLESHOOTING CONNECTION TIMEOUT:');
//           console.error('');
//           console.error('   Option 1: Try Port 465 with SSL (Recommended)');
//           console.error('   Add to your .env file:');
//           console.error('   EMAIL_PORT=465');
//           console.error('   EMAIL_SECURE=true');
//           console.error('');
//           console.error('   Option 2: Check Network/Firewall');
//           console.error('   - Port 587 might be blocked by firewall/antivirus');
//           console.error('   - Try temporarily disabling firewall to test');
//           console.error('   - Check if your ISP blocks SMTP ports');
//           console.error('');
//           console.error('   Option 3: Verify Gmail Settings');
//           console.error('   - Ensure EMAIL_USER matches your Gmail address exactly');
//           console.error('   - Use App Password (not regular password)');
//           console.error('   - Enable 2-Step Verification on Google Account');
//           console.error('   - Check: https://myaccount.google.com/apppasswords');
//           console.error('');
//           console.error('   Option 4: Test Connection');
//           console.error('   - Try: telnet smtp.gmail.com 587 (or 465)');
//           console.error('   - If connection fails, port is blocked');
//         }
//       }
//     }

//     const finalError = lastError || new Error('Email sending failed after all retries');
//     console.error('❌ Email sending failed after all retry attempts');
//     console.error('   Final error:', finalError.message);
    
//     if (throwOnError) {
//       throw finalError;
//     }
    
//     console.warn('⚠️  Email sending failed, but operation will continue');
//     return null;
//   }
// }

// export default new EmailService();

import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

// Debug environment variables
console.log("=== EMAIL CONFIG DEBUG ===");
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "SET" : "NOT SET");
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "SET" : "NOT SET");
console.log("==========================");

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

class EmailService {
  async sendEmail(to: string, subject: string, text: string, html?: string, cc?: string | string[]) {
    try {
      console.log("=== SENDING EMAIL ===");
      console.log("To:", to);
      console.log("CC:", cc);
      console.log("Subject:", subject);
      console.log("From:", process.env.EMAIL_USER);
      
      const mailOptions: any = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
        html,
      };

      if (cc) {
        mailOptions.cc = cc;
      }

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Test method to verify email configuration
  async testEmailConfig() {
    try {
      console.log("Testing email configuration...");
      const testResult = await transporter.verify();
      console.log("Email configuration is valid:", testResult);
      return testResult;
    } catch (error) {
      console.error("Email configuration test failed:", error);
      return false;
    }
  }
}

export default new EmailService();