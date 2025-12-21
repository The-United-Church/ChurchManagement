import emailService from "./email.service";

export async function sendPasswordLink(from: any, to: any, link: string) {
  const subject = "Reset Your Password";

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset</title>
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

      .button-container {
        text-align: center;
        margin: 30px 0;
      }

      .button {
        background-color: #004aad;
        color: #ffffff !important;
        padding: 14px 28px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        box-shadow: 0 6px 18px rgba(0, 74, 173, 0.25);
        transition: background 0.3s ease;
      }

      .button:hover {
        background-color: #003c91;
      }

      .fallback-link {
        background-color: #f9f9f9;
        padding: 12px;
        word-break: break-word;
        font-size: 13px;
        color: #555;
        border-left: 4px solid #004aad;
        margin-top: 20px;
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

        .button {
          padding: 12px 20px;
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
        <h2>Password Reset Requested</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. If this was you, please click the button below:</p>

        <div class="button-container">
          <a href="${link}" class="button">Reset Password</a>
        </div>

        <p>If the button doesn’t work, copy and paste this link into your browser:</p>
        <div class="fallback-link">${link}</div>

        <p>This link will expire in <strong>1 hour</strong>. If you didn’t request a password reset, you can safely ignore this email.</p>
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

  return emailService.sendEmail(from, to, "", html);
}
