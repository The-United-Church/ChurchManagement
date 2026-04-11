import { firebaseAdmin } from '../config/firebase.admin';
import { ActivityAction, EntityType } from '../models/activity-log.model';

const db = firebaseAdmin.firestore();

export const logActivity = async (
	userId: string | undefined,
	action: ActivityAction,
	entityType: EntityType,
	entityId: string | number | undefined,
	description: string,
	metadata?: Record<string, any>
): Promise<void> => {
	try {
		const userEmail: string | undefined = metadata?.email;
		const COLLECTION = `${process.env.ACTIVITY_LOG_COLLECTION || 'app'}_activity_logs`;
		await db.collection(COLLECTION).add({
			user_id: userId ?? null,
			user: userEmail ? { email: userEmail } : null,
			action,
			entityType,
			entityId: entityId ? String(entityId) : null,
			description,
			metadata: metadata ?? {},
			createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
		});
	} catch (error) {
		console.error('Failed to log activity:', error);
	}
};

