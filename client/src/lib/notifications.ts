import {
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firebaseDb } from '@/lib/firebase';

export type NotificationType = 'message' | 'member' | 'event' | 'security' | 'announcement' | 'registration' | 'system';

export interface AppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Timestamp | Date | string | null;
  read: boolean;
  readAt?: Timestamp | Date | string | null;
  link?: string;
  metadata?: Record<string, unknown>;
}

export function subscribeNotifications(
  recipientId: string,
  cb: (rows: AppNotification[]) => void,
  maxItems = 30,
): () => void {
  const notificationsQuery = query(
    collection(firebaseDb, 'notifications'),
    where('recipientId', '==', recipientId),
    orderBy('createdAt', 'desc'),
    limit(maxItems),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const rows = snapshot.docs.map((notificationDoc) => ({
        id: notificationDoc.id,
        ...(notificationDoc.data() as Omit<AppNotification, 'id'>),
      }));
      cb(rows);
    },
    () => cb([]),
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(firebaseDb, 'notifications', notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;

  const batch = writeBatch(firebaseDb);
  notificationIds.forEach((notificationId) => {
    batch.update(doc(firebaseDb, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export function notificationDate(value: AppNotification['createdAt']): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}