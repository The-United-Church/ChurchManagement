import emailService from "./email.service";

export async function sendWorkOrderRequestApprovedEmail(to: string, requestDetails: {
  requestId: string;
  requesterName: string;
  issueDescription: string;
  priority: string;
  assetName?: string;
}) {
  const subject = "Work Order Request Approved";

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Work Order Request Approved</title>
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
        margin-bottom: 10px;
      }

      .status-badge {
        display: inline-block;
        background-color: #28a745;
        color: white;
        padding: 5px 15px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 20px;
      }

      .details {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        border-left: 4px solid #004aad;
      }

      .detail-row {
        margin-bottom: 10px;
      }

      .detail-label {
        font-weight: bold;
        color: #004aad;
        display: inline-block;
        width: 120px;
      }

      .detail-value {
        color: #333;
      }

      .footer {
        text-align: center;
        padding: 20px;
        color: #666;
        font-size: 14px;
        border-top: 1px solid #eee;
        margin-top: 30px;
      }

      .button {
        display: inline-block;
        background: linear-gradient(135deg, #004aad, #00b7ff);
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        margin: 20px 0;
      }

      .priority-high {
        color: #dc3545;
        font-weight: bold;
      }

      .priority-medium {
        color: #ffc107;
        font-weight: bold;
      }

      .priority-low {
        color: #28a745;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="color: white; margin: 0; font-size: 24px;">Ferncot AMS</h1>
      </div>

      <div class="content">
        <h2>Work Order Request Approved</h2>
        <div class="status-badge">APPROVED</div>

        <p>Dear Technician,</p>

        <p>Your work order request has been approved. Please find the details below:</p>

        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Request ID:</span>
            <span class="detail-value">${requestDetails.requestId}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Requester:</span>
            <span class="detail-value">${requestDetails.requesterName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Asset:</span>
            <span class="detail-value">${requestDetails.assetName || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Priority:</span>
            <span class="detail-value ${requestDetails.priority.toLowerCase()}">${requestDetails.priority.toUpperCase()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Issue:</span>
            <span class="detail-value">${requestDetails.issueDescription}</span>
          </div>
        </div>

        <p>Please proceed with the necessary maintenance or repair work as soon as possible.</p>

        <p>If you have any questions, please contact the maintenance team.</p>

        <p>Best regards,<br>
        Ferncot AMS System</p>
      </div>

      <div class="footer">
        <p>This is an automated message from Ferncot Asset Management System.<br>
        Please do not reply to this email.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const text = `
Work Order Request Approved

Dear Technician,

Your work order request has been approved.

Request Details:
- Request ID: ${requestDetails.requestId}
- Requester: ${requestDetails.requesterName}
- Asset: ${requestDetails.assetName || 'N/A'}
- Priority: ${requestDetails.priority.toUpperCase()}
- Issue: ${requestDetails.issueDescription}

Please proceed with the necessary maintenance or repair work.

Best regards,
Ferncot AMS System
  `;

  await emailService.sendEmail(to, subject, text, html);
}
