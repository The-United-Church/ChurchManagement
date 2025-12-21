import emailService from "./email.service";

export async function sendWelcomeEmail(to: string, verificationCode: string) {
  const subject = "Verify Your Email Address";

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Email Verification</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: url('https://www.transparenttextures.com/patterns/clean-textile.png'), #f2f6ff;
        background-repeat: repeat;
        margin: 0;
        padding: 0;
        color: #333;
      }

      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        padding: 40px 30px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.07);
        overflow: hidden;
      }

      .header {
        background: linear-gradient(135deg, #004aad, #00b7ff);
        padding: 20px 0;
        text-align: center;
      }

      .header img {
        width: 80px;
        height: auto;
      }

      .content {
        padding: 30px 20px;
      }

      h2 {
        color: #004aad;
        font-size: 22px;
        margin-bottom: 20px;
      }

      .code-box {
        background-color: #f1f1f1;
        padding: 16px;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 5px;
        color: #004aad;
        border-radius: 8px;
        margin: 20px 0;
      }

      .footer {
        text-align: center;
        font-size: 12px;
        color: #777;
        margin-top: 40px;
        padding: 20px;
        border-top: 1px solid #e6e6e6;
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
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://static.vecteezy.com/system/resources/previews/047/656/219/non_2x/abstract-logo-design-for-any-corporate-brand-business-company-vector.jpg" alt="Logo" />
      </div>
      <div class="content">
        <h2>Verify Your Email</h2>
        <p>Hello,</p>
        <p>Thank you for registering. Please use the verification code below to complete your registration:</p>
        <div class="code-box">${verificationCode}</div>
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

  const text = `Your verification code is: ${verificationCode}`;
//   return emailService.sendEmail(to, subject, text, html);
await emailService.sendEmail(to, subject, text, html);

}
