import emailService from "./email.service";

export async function send2FACodeEmail(to: string, code: string) {
  const subject = "Your 2FA Verification Code";

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>2FA Verification Code</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(to bottom right, #f0f4ff, #e8f0fe);
        margin: 0;
        padding: 0;
        color: #333;
      }

      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        padding: 40px 30px;
        border-radius: 16px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.07);
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
        font-size: 22px;
        margin-bottom: 16px;
        text-align: center;
      }

      p {
        font-size: 15px;
        line-height: 1.6;
        color: #444;
        text-align: center;
      }

      .code {
        display: inline-block;
        background-color: #f5f5f5;
        padding: 12px 24px;
        font-size: 24px;
        font-weight: bold;
        color: #004aad;
        border-radius: 8px;
        margin: 20px auto;
        box-shadow: 0 4px 12px rgba(0, 74, 173, 0.1);
      }

      .footer {
        text-align: center;
        font-size: 12px;
        color: #777;
        margin-top: 40px;
        padding: 20px;
        border-top: 1px solid #ddd;
      }

      .socials {
        margin-top: 15px;
      }

      .socials a {
        margin: 0 6px;
        display: inline-block;
      }

      .socials img {
        width: 24px;
        height: 24px;
        filter: grayscale(100%) brightness(1.2);
      }

      @media (max-width: 600px) {
        .container {
          padding: 20px 15px;
        }

        .code {
          font-size: 20px;
          padding: 10px 18px;
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
        <h2>Two-Factor Authentication</h2>
        <p>Your one-time 2FA verification code is:</p>
        <div class="code">${code}</div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
      </div>

      <div class="footer">
        <p>Need help? <a href="mailto:support@yourdomain.com">Contact Support</a></p>
        <div class="socials">
          <a href="https://facebook.com"><img src="https://cdn-icons-png.flaticon.com/512/145/145802.png" alt="Facebook" /></a>
          <a href="https://twitter.com"><img src="https://cdn-icons-png.flaticon.com/512/145/145812.png" alt="Twitter" /></a>
          <a href="https://linkedin.com"><img src="https://cdn-icons-png.flaticon.com/512/145/145807.png" alt="LinkedIn" /></a>
        </div>
        <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} Otuobiri. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `Your 2FA verification code is: ${code}\n\nThis code will expire in 10 minutes.`;

  return emailService.sendEmail(to, subject, text, html);
}
