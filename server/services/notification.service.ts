import { firebaseAdmin } from "../config/firebase.admin";
import { Logger } from "../utils/logger";

const logger = new Logger({ level: "info" });
const NOTIFICATIONS_COLLECTION = process.env.NOTIFICATIONS_COLLECTION || "notifications";

export interface CreateInAppNotificationDTO {
  recipientId: string;
  type?: "message" | "member" | "event" | "security" | "announcement" | "registration" | "system";
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createInAppNotification(data: CreateInAppNotificationDTO): Promise<void> {
  try {
    await firebaseAdmin.firestore().collection(NOTIFICATIONS_COLLECTION).add({
      recipientId: data.recipientId,
      type: data.type || "system",
      title: data.title,
      message: data.message,
      read: false,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      ...(data.link ? { link: data.link } : {}),
      ...(data.metadata ? { metadata: data.metadata } : {}),
    });
  } catch (err) {
    logger.error("[NotificationService] Failed to create in-app notification:", err);
  }
}