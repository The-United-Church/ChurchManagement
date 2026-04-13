import { churchFlowEmail } from "./email.layout";
import { Event } from "../models/event/event.model";
import { AppDataSource } from "../config/database";
import { BranchMembership } from "../models/church/branch-membership.model";
import { User } from "../models/user.model";

const styles = {
  heading: "margin:0 0 16px;font-size:22px;font-weight:700;color:#1F2937;",
  paragraph: "margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;",
  detail: "margin:0 0 6px;font-size:14px;color:#6B7280;",
  button:
    "display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;",
};

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildEventEmailBody(event: Event): string {
  const dashboardUrl = process.env.URL || "http://localhost:5173";
  return `
    <h2 style="${styles.heading}">New Event: ${event.title}</h2>
    <p style="${styles.paragraph}">A new event has been scheduled for your branch.</p>
    <p style="${styles.detail}"><strong>Category:</strong> ${formatCategory(event.category)}</p>
    <p style="${styles.detail}"><strong>Date:</strong> ${event.date}</p>
    <p style="${styles.detail}"><strong>Time:</strong> ${event.time_from} – ${event.time_to}</p>
    <p style="${styles.detail}"><strong>Location:</strong> ${event.location}</p>
    ${event.description ? `<p style="${styles.paragraph}">${event.description}</p>` : ""}
    <div style="text-align:center;margin:28px 0;">
      <a href="${dashboardUrl}/events" style="${styles.button}">View Event →</a>
    </div>
  `;
}

export async function sendEventNotificationEmail(event: Event): Promise<void> {
  try {
    const membershipRepo = AppDataSource.getRepository(BranchMembership);
    const memberships = await membershipRepo.find({
      where: { branch_id: event.branch_id, is_active: true },
      relations: ["user"],
    });

    const recipients = memberships
      .map((m) => (m as any).user as User | undefined)
      .filter((u): u is User => !!u && !!u.email && u.id !== event.created_by);

    if (recipients.length === 0) return;

    const subject = `New Event: ${event.title}`;
    const body = buildEventEmailBody(event);
    const html = churchFlowEmail(body, `New event "${event.title}" at your branch`);

    // Dynamic import to avoid breaking if email service is commented out
    const emailService = (await import("./email.service")).default;
    if (!emailService?.sendEmail) return;

    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((u) => emailService.sendEmail(u.email, subject, event.title, html)),
      );
    }
  } catch (err) {
    console.error("[email] Failed to send event notifications:", err);
  }
}
