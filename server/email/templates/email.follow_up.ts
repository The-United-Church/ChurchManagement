import emailService from "../email.service";
import { churchFlowEmail, styles } from "../email.layout";

interface FollowUpEmailContext {
  recipientName?: string | null;
  title: string;
  message: string;
  actionUrl?: string;
}

export async function sendFollowUpNotificationEmail(to: string, ctx: FollowUpEmailContext) {
  const body = `
    <h2 style="${styles.heading}">${ctx.title}</h2>
    <p style="${styles.paragraph}">Hello ${ctx.recipientName || "there"},</p>
    <p style="${styles.paragraph}">${ctx.message}</p>
    ${ctx.actionUrl ? `<p style="text-align:center;margin:28px 0;"><a href="${ctx.actionUrl}" style="${styles.button}">Open Follow-ups</a></p>` : ""}
    <p style="${styles.muted}">You can change follow-up email preferences in your notification settings.</p>
  `;

  return emailService.sendEmail(
    to,
    ctx.title,
    ctx.message,
    churchFlowEmail(body, ctx.message),
  );
}