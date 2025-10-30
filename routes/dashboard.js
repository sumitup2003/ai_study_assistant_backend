import express from 'express';
import { protect } from '../middleware/auth.js';
import { getDashboardStats, getStudyAnalytics } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getDashboardStats);
router.get('/analytics', getStudyAnalytics);

export default router;