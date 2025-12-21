import emailService from "./email.service";

export async function sendPasswordResetOtpEmail(to: string, otp: string) {
  const subject = "Password Reset Verification Code";

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset Verification</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(180deg, #f0f4ff 0%, #e8f0fe 100%);
        margin: 0;
        padding: 0;
        color: #333;
        background-repeat: no-repeat;
      }

      .container {
        max-width: 600px;
        margin: 50px auto;
        background-color: rgba(255, 255, 255, 0.95);
        padding: 40px 30px;
        border-radius: 16px;
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(10px);
      }

      .header {
        background: linear-gradient(135deg, #004aad, #00b7ff);
        padding: 24px 0;
        text-align: center;
        border-radius: 12px 12px 0 0;
      }

      .header img {
        width: 90px;
        height: auto;
      }

      .content {
        padding: 30px 20px;
      }

      h2 {
        color: #004aad;
        font-size: 24px;
        margin-bottom: 20px;
        text-align: center;
      }

      p {
        font-size: 15px;
        line-height: 1.6;
        color: #444;
      }

      .code-box {
        background-color: #eef4ff;
        border-left: 4px solid #004aad;
        padding: 20px;
        margin: 30px auto;
        text-align: center;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 8px;
        color: #004aad;
        max-width: 320px;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
      }

      .warning {
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 12px;
        margin: 20px 0;
        font-size: 14px;
        color: #856404;
      }

      .footer {
        text-align: center;
        font-size: 13px;
        color: #777;
        margin-top: 40px;
        padding: 20px;
        border-top: 1px solid #ddd;
      }

      .socials {
        margin-top: 12px;
      }

      .socials a {
        margin: 0 8px;
        display: inline-block;
        text-decoration: none;
      }

      .socials img {
        width: 26px;
        height: 26px;
        filter: grayscale(100%) brightness(1.2);
        transition: filter 0.3s ease;
      }

      .socials img:hover {
        filter: none;
      }

      @media (max-width: 600px) {
        .container {
          padding: 20px 15px;
        }

        h2 {
          font-size: 20px;
        }

        .code-box {
          font-size: 24px;
          letter-spacing: 4px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://static.vecteezy.com/system/resources/previews/047/656/219/non_2x/abstract-logo-design-for-any-corporate-brand-business-company-vector.jpg" alt="Company Logo" />
      </div>

      <div class="content">
        <h2>Password Reset Verification</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Use the verification code below to proceed:</p>

        <div class="code-box">${otp}</div>

        <div class="warning">
          <strong>Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
        </div>

        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>

      <div class="footer">
        <p>Need help? <a href="mailto:support@yourdomain.com">Contact Support</a></p>
        <div class="socials">
          <a href="https://facebook.com"><img src="https://cdn-icons-png.flaticon.com/512/145/145802.png" alt="Facebook" /></a>
          <a href="https://twitter.com"><img src="https://cdn-icons-png.flaticon.com/512/145/145812.png" alt="Twitter" /></a>
          <a href="https://linkedin.com"><img src="https://cdn-icons-png.flaticon.com/512/145/145807.png" alt="LinkedIn" /></a>
        </div>
        <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} Marine Operations. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `Password Reset Verification\n\nYour password reset code is: ${otp}\n\nThis code will expire in 10 minutes. Do not share this code with anyone.\n\nIf you didn't request a password reset, you can safely ignore this email.`;

  return emailService.sendEmail(to, subject, text, html);
}
