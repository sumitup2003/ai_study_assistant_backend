import express from 'express';
import { protect } from '../middleware/auth.js';
import { getSummary } from '../controllers/summaryController.js';

const router = express.Router();

router.use(protect);

router.get('/:noteId', getSummary);

export default router;