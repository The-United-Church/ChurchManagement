import { Router } from 'express';
import {
	getActivities,
	getRecentActivities,
} from '../controllers/activity-log.controller';

const router = Router();

router.get('/', getActivities);
router.get('/recent', getRecentActivities);

export default router;

