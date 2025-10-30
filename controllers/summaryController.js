import Note from '../models/Note.js';
import StudySession from '../models/StudySession.js';

export const getSummary = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await Note.findOne({
      _id: noteId,
      user: req.user._id
    }).select('title summary keyPoints createdAt');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Log study session
    await StudySession.create({
      user: req.user._id,
      note: noteId,
      activityType: 'summary',
      duration: 2
    });

    res.json({
      success: true,
      summary: {
        title: note.title,
        summary: note.summary,
        keyPoints: note.keyPoints,
        createdAt: note.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};