import { ActivityLogService, CreateActivityLogDto } from '../services/activity-log.service';
import { ActivityAction, EntityType } from '../models/activity-log.model';

const activityLogService = new ActivityLogService();

export const logActivity = async (
	userId: string | undefined,
	action: ActivityAction,
	entityType: EntityType,
	entityId: string | number | undefined,
	description: string,
	metadata?: Record<string, any>
): Promise<void> => {
	try {
		await activityLogService.createActivity({
			userId,
			action,
			entityType,
			entityId: entityId ? String(entityId) : undefined,
			description,
			metadata,
		});
	} catch (error) {
		console.error('Failed to log activity:', error);
	}
};

