import { AppDataSource } from "../config/database";
import {
  ActivityLog,
  ActivityAction,
  EntityType,
} from "../models/activity-log.model";

export interface CreateActivityLogDto {
  userId?: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export class ActivityLogService {
  private readonly activityLogRepository =
    AppDataSource.getRepository(ActivityLog);

  async createActivity(activityData: CreateActivityLogDto): Promise<ActivityLog> {
    const activity = this.activityLogRepository.create({
      user_id: activityData.userId,
      action: activityData.action,
      entityType: activityData.entityType,
      entityId: activityData.entityId,
      description: activityData.description,
      metadata: activityData.metadata || {},
    });

    return await this.activityLogRepository.save(activity);
  }

  async getActivities(options?: {
    limit?: number;
    offset?: number;
    entityType?: EntityType;
    action?: ActivityAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ activities: ActivityLog[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      entityType,
      action,
      userId,
      startDate,
      endDate,
    } = options || {};

    const queryBuilder = this.activityLogRepository
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.user", "user")
      .orderBy("activity.createdAt", "DESC");

    if (entityType) {
      queryBuilder.andWhere("activity.entityType = :entityType", { entityType });
    }

    if (action) {
      queryBuilder.andWhere("activity.action = :action", { action });
    }

    if (userId) {
      queryBuilder.andWhere("activity.user_id = :userId", { userId });
    }

    if (startDate) {
      queryBuilder.andWhere("activity.createdAt >= :startDate", { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere("activity.createdAt <= :endDate", { endDate });
    }

    const [activities, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { activities, total };
  }

  async getRecentActivities(limit: number = 20): Promise<ActivityLog[]> {
    const { activities } = await this.getActivities({ limit });
    return activities;
  }
}

