import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { ActivityLogService } from '../services/activity-log.service';
import { ActivityAction, EntityType } from '../models/activity-log.model';

const activityLogService = new ActivityLogService();

export const getActivities = asyncHandler(async (req: Request, res: Response) => {
	const {
		limit = 50,
		offset = 0,
		entityType,
		action,
		userId,
		startDate,
		endDate,
	} = req.query;

	const options: any = {
		limit: parseInt(limit as string),
		offset: parseInt(offset as string),
	};

	if (entityType) {
		options.entityType = entityType as EntityType;
	}

	if (action) {
		options.action = action as ActivityAction;
	}

	if (userId) {
		options.userId = userId as string;
	}

	if (startDate) {
		options.startDate = new Date(startDate as string);
	}

	if (endDate) {
		options.endDate = new Date(endDate as string);
	}

	const result = await activityLogService.getActivities(options);
	res.json({ data: result.activities, total: result.total, message: 'Activities fetched successfully', status: true });
});

export const getRecentActivities = asyncHandler(async (req: Request, res: Response) => {
	const limit = parseInt(req.query.limit as string) || 20;
	const activities = await activityLogService.getRecentActivities(limit);
	res.json({ data: activities, message: 'Recent activities fetched successfully', status: true });
});

