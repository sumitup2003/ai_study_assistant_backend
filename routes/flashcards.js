import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  generateFlashcardsForNote,
  getFlashcards,
  updateFlashcardReview,
  deleteFlashcard,
  deleteAllFlashcardsForNote
} from '../controllers/flashcardsController.js';

const router = express.Router();

router.use(protect);

router.post('/generate/:noteId', generateFlashcardsForNote);
router.get('/note/:noteId', getFlashcards);
router.put('/:id/review', updateFlashcardReview);
router.delete('/:id', deleteFlashcard);
router.delete('/note/:noteId/all', deleteAllFlashcardsForNote); // New route

export default router;