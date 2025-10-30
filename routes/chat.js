import express from 'express';
import { protect } from '../middleware/auth.js';
import { askQuestion, getChatHistory } from '../controllers/chatController.js';

const router = express.Router();

router.use(protect);

router.post('/ask', askQuestion);
router.get('/history/:noteId', getChatHistory);

export default router;