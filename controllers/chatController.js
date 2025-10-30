import Note from '../models/Note.js';
import StudySession from '../models/StudySession.js';
import { answerQuestion } from '../services/aiService.js';

export const askQuestion = async (req, res) => {
  try {
    const { noteId, question } = req.body;

    if (!question || !noteId) {
      return res.status(400).json({ message: 'Question and noteId are required' });
    }

    // Get note content
    const note = await Note.findOne({
      _id: noteId,
      user: req.user._id
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Get AI answer
    const answer = await answerQuestion(question, note.content);

    // Log study session
    await StudySession.create({
      user: req.user._id,
      note: noteId,
      activityType: 'chat',
      duration: 1 // minimal duration for chat
    });

    res.json({
      success: true,
      question,
      answer
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const sessions = await StudySession.find({
      user: req.user._id,
      note: req.params.noteId,
      activityType: 'chat'
    })
    .sort('-createdAt')
    .limit(50);

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};