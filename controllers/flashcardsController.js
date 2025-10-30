import Flashcard from '../models/Flashcard.js';
import Note from '../models/Note.js';
import User from '../models/User.js';
import StudySession from '../models/StudySession.js';
import { generateFlashcards } from '../services/aiService.js';

export const generateFlashcardsForNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { count = 10 } = req.body;

    const note = await Note.findOne({
      _id: noteId,
      user: req.user._id
    });

    if (!note) {
      return res.status(404).json({ 
        success: false,
        message: 'Note not found' 
      });
    }

    // Check if flashcards already exist
    const existingCount = await Flashcard.countDocuments({
      user: req.user._id,
      note: noteId
    });

    if (existingCount > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Flashcards already exist for this note. Delete existing flashcards first if you want to regenerate.',
        count: existingCount 
      });
    }

    // Check if note has enough content
    if (!note.content || note.content.length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Note content is too short to generate flashcards. Please add more content.'
      });
    }

    // Generate flashcards using AI with retry logic
    let generatedCards;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`Generating flashcards... Attempt ${attempts + 1}/${maxAttempts}`);
        generatedCards = await generateFlashcards(note.content, count);
        break; // Success, exit loop
      } catch (error) {
        attempts++;
        
        if (error.message.includes('over capacity') || error.message.includes('503')) {
          if (attempts < maxAttempts) {
            console.log(`AI service busy. Retrying in ${attempts * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempts * 2000));
            continue;
          }
          return res.status(503).json({
            success: false,
            message: 'AI service is currently busy. Please try again in a few moments.'
          });
        }
        
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    // Validate generated cards
    if (!generatedCards || generatedCards.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate flashcards. Please try again or try with different content.'
      });
    }

    // Save to database
    const flashcards = await Flashcard.insertMany(
      generatedCards.map(card => ({
        user: req.user._id,
        note: noteId,
        question: card.question || 'Question',
        answer: card.answer || 'Answer',
        difficulty: card.difficulty || 'medium'
      }))
    );

    console.log(`Successfully generated ${flashcards.length} flashcards`);

    res.json({
      success: true,
      count: flashcards.length,
      flashcards
    });
  } catch (error) {
    console.error('Flashcard generation error:', error);
    
    // Send user-friendly error message
    const errorMessage = error.message.includes('over capacity') 
      ? 'AI service is currently busy. Please try again in a few moments.'
      : error.message.includes('parse')
      ? 'Failed to process AI response. Please try again.'
      : 'Failed to generate flashcards. Please try again.';
    
    res.status(500).json({ 
      success: false,
      message: errorMessage 
    });
  }
};

export const getFlashcards = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { mastered } = req.query;

    const query = {
      user: req.user._id,
      note: noteId
    };

    if (mastered !== undefined) {
      query.mastered = mastered === 'true';
    }

    const flashcards = await Flashcard.find(query).sort('createdAt');

    res.json({
      success: true,
      count: flashcards.length,
      flashcards
    });
  } catch (error) {
    console.error('Get flashcards error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve flashcards' 
    });
  }
};

export const updateFlashcardReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { isCorrect } = req.body;

    const flashcard = await Flashcard.findOne({
      _id: id,
      user: req.user._id
    });

    if (!flashcard) {
      return res.status(404).json({ 
        success: false,
        message: 'Flashcard not found' 
      });
    }

    // Update review stats
    flashcard.reviewCount += 1;
    if (isCorrect) {
      flashcard.correctCount += 1;
    }
    flashcard.lastReviewed = new Date();

    // Calculate mastery (if 80% accuracy and reviewed 5+ times)
    const accuracy = flashcard.correctCount / flashcard.reviewCount;
    if (accuracy >= 0.8 && flashcard.reviewCount >= 5) {
      flashcard.mastered = true;
    }

    await flashcard.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'studyStats.flashcardsReviewed': 1 }
    });

    // Log study session
    await StudySession.create({
      user: req.user._id,
      note: flashcard.note,
      activityType: 'flashcard',
      duration: 1,
      performance: {
        accuracy: accuracy * 100
      }
    });

    res.json({
      success: true,
      flashcard
    });
  } catch (error) {
    console.error('Update flashcard review error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update flashcard review' 
    });
  }
};

export const deleteFlashcard = async (req, res) => {
  try {
    const flashcard = await Flashcard.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!flashcard) {
      return res.status(404).json({ 
        success: false,
        message: 'Flashcard not found' 
      });
    }

    res.json({
      success: true,
      message: 'Flashcard deleted successfully'
    });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete flashcard' 
    });
  }
};

export const deleteAllFlashcardsForNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    const result = await Flashcard.deleteMany({
      user: req.user._id,
      note: noteId
    });

    res.json({
      success: true,
      message: `${result.deletedCount} flashcard(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all flashcards error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete flashcards' 
    });
  }
};