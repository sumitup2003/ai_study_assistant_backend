import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  uploadNote,
  getNotes,
  getNoteById,
  deleteNote,
  updateNote
} from '../controllers/notesController.js';

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('file'), uploadNote);
router.get('/', getNotes);
router.get('/:id', getNoteById);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;