import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/roleCheck';
import { getActivityLogs } from '../middleware/activityLogger';
import { AuthenticatedRequest, ActivityAction } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);
router.use(isAdmin);

/**
 * GET /api/v1/activity-logs
 * Query params: page, limit, user_id, action, entity_type, start_date, end_date, search
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      page = '1',
      limit = '30',
      user_id,
      action,
      entity_type,
      start_date,
      end_date,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 30, 100);
    const offset = (pageNum - 1) * limitNum;

    const result = await getActivityLogs({
      userId: user_id ? parseInt(user_id as string, 10) : undefined,
      action: action as ActivityAction | undefined,
      entityType: entity_type as string | undefined,
      startDate: start_date ? new Date(start_date as string) : undefined,
      endDate: end_date ? new Date(end_date as string) : undefined,
      limit: limitNum,
      offset,
    });

    const totalPages = Math.ceil(result.total / limitNum);

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  })
);

export default router;
