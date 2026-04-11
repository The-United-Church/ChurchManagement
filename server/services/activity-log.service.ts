import { firebaseAdmin } from '../config/firebase.admin';
import { ActivityAction, EntityType } from '../models/activity-log.model';
import { Timestamp } from 'firebase-admin/firestore';

const db = firebaseAdmin.firestore();
const COLLECTION = `${process.env.ACTIVITY_LOG_COLLECTION || 'app'}_activity_logs`;
// const COLLECTION = 'activity_logs';

/** Shape returned by all read methods */
export interface ActivityLogDoc {
  id: string;
  user_id: string | null;
  user: { email: string } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, any>;
  createdAt: string; // ISO string
}

export interface GetActivitiesOptions {
  limit?: number;
  offset?: number;
  entityType?: EntityType;
  action?: ActivityAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class ActivityLogService {
  // ─── Write (kept for backwards compat; primary writes go via logActivity util) ──

  async createActivity(data: {
    userId?: string;
    action: ActivityAction;
    entityType: EntityType;
    entityId?: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await db.collection(COLLECTION).add({
      user_id: data.userId ?? null,
      user: null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      description: data.description,
      metadata: data.metadata ?? {},
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // ─── Reads ──────────────────────────────────────────────────────────────────

  async getActivities(
    options: GetActivitiesOptions = {}
  ): Promise<{ activities: ActivityLogDoc[]; total: number }> {
    const { limit = 50, offset = 0, entityType, action, userId, startDate, endDate } = options;

    let query: FirebaseFirestore.Query = db
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc');

    if (entityType) query = query.where('entityType', '==', entityType);
    if (action) query = query.where('action', '==', action);
    if (userId) query = query.where('user_id', '==', userId);
    if (startDate) query = query.where('createdAt', '>=', Timestamp.fromDate(startDate));
    if (endDate) query = query.where('createdAt', '<=', Timestamp.fromDate(endDate));

    // Count total documents matching filters
    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    // Cursor-based offset emulation
    let pageQuery = query.limit(limit);
    if (offset > 0) {
      const skipSnap = await query.limit(offset).get();
      const lastDoc = skipSnap.docs[skipSnap.docs.length - 1];
      if (lastDoc) pageQuery = query.startAfter(lastDoc).limit(limit);
    }

    const snap = await pageQuery.get();
    return { activities: snap.docs.map(docToLog), total };
  }

  async getRecentActivities(limit: number = 20): Promise<ActivityLogDoc[]> {
    const snap = await db
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(docToLog);
  }

  async getStats(days: number = 30): Promise<{
    byAction: { action: string; count: number }[];
    byEntity: { entityType: string; count: number }[];
    daily: { date: string; count: number }[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const snap = await db
      .collection(COLLECTION)
      .where('createdAt', '>=', Timestamp.fromDate(since))
      .get();

    const byActionMap: Record<string, number> = {};
    const byEntityMap: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};

    for (const doc of snap.docs) {
      const d = doc.data();

      const act: string = d.action ?? 'unknown';
      byActionMap[act] = (byActionMap[act] ?? 0) + 1;

      const ent: string = d.entityType ?? 'unknown';
      byEntityMap[ent] = (byEntityMap[ent] ?? 0) + 1;

      const ts: Timestamp | undefined = d.createdAt;
      if (ts) {
        const dateKey = ts.toDate().toISOString().slice(0, 10);
        dailyMap[dateKey] = (dailyMap[dateKey] ?? 0) + 1;
      }
    }

    return {
      byAction: Object.entries(byActionMap).map(([action, count]) => ({ action, count })),
      byEntity: Object.entries(byEntityMap).map(([entityType, count]) => ({ entityType, count })),
      daily: Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
    };
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function docToLog(doc: FirebaseFirestore.QueryDocumentSnapshot): ActivityLogDoc {
  const d = doc.data();
  const ts: Timestamp | undefined = d.createdAt;
  return {
    id: doc.id,
    user_id: d.user_id ?? null,
    user: d.user ?? null,
    action: d.action,
    entityType: d.entityType,
    entityId: d.entityId ?? null,
    description: d.description,
    metadata: d.metadata ?? {},
    createdAt: ts ? ts.toDate().toISOString() : new Date(0).toISOString(),
  };
}

