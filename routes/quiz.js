import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  generateQuizForNote,
  getQuizzes,
  getQuizById,
  submitQuiz
} from '../controllers/quizController.js';

const router = express.Router();

router.use(protect);

router.post('/generate/:noteId', generateQuizForNote);
router.get('/note/:noteId', getQuizzes);
router.get('/:id', getQuizById);
router.post('/:id/submit', submitQuiz);

export default router;