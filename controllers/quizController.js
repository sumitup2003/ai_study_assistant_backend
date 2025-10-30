import Quiz from '../models/Quiz.js';
import Note from '../models/Note.js';
import User from '../models/User.js';
import StudySession from '../models/StudySession.js';
import { generateQuiz } from '../services/aiService.js';

export const generateQuizForNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { questionCount = 5 } = req.body;

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

    // Check if note has enough content
    if (!note.content || note.content.length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Note content is too short to generate a quiz. Please add more content.'
      });
    }

    // Generate quiz using AI with retry logic
    let questions;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`Generating quiz... Attempt ${attempts + 1}/${maxAttempts}`);
        questions = await generateQuiz(note.content, questionCount);
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

    // Validate generated questions
    if (!questions || questions.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate quiz. Please try again or try with different content.'
      });
    }

    // Create quiz
    const quiz = await Quiz.create({
      user: req.user._id,
      note: noteId,
      title: `Quiz: ${note.title}`,
      questions: questions.map(q => ({
        question: q.question || 'Question',
        options: q.options || ['A', 'B', 'C', 'D'],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        explanation: q.explanation || 'Explanation not available'
      })),
      totalQuestions: questions.length
    });

    console.log(`Successfully generated quiz with ${questions.length} questions`);

    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    
    // Send user-friendly error message
    const errorMessage = error.message.includes('over capacity') 
      ? 'AI service is currently busy. Please try again in a few moments.'
      : error.message.includes('parse')
      ? 'Failed to process AI response. Please try again.'
      : 'Failed to generate quiz. Please try again.';
    
    res.status(500).json({ 
      success: false,
      message: errorMessage 
    });
  }
};

export const getQuizzes = async (req, res) => {
  try {
    const { noteId } = req.params;

    const quizzes = await Quiz.find({
      user: req.user._id,
      note: noteId
    })
    .sort('-createdAt')
    .select('-questions.correctAnswer -questions.explanation');

    res.json({
      success: true,
      count: quizzes.length,
      quizzes
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve quizzes' 
    });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('-questions.correctAnswer -questions.explanation');

    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to retrieve quiz' 
    });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    if (quiz.completed) {
      return res.status(400).json({ 
        success: false,
        message: 'Quiz already completed' 
      });
    }

    // Validate answers
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answers submitted'
      });
    }

    // Calculate score
    let correctCount = 0;
    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      question.userAnswer = userAnswer;
      question.isCorrect = userAnswer === question.correctAnswer;
      if (question.isCorrect) correctCount++;
    });

    quiz.score = (correctCount / quiz.totalQuestions) * 100;
    quiz.completed = true;
    quiz.timeTaken = timeTaken || 0;

    await quiz.save();

    // Update user stats
    const user = await User.findById(req.user._id);
    const totalQuizzes = user.studyStats.quizzesTaken + 1;
    const newAverage = (
      (user.studyStats.averageQuizScore * user.studyStats.quizzesTaken + quiz.score) / 
      totalQuizzes
    );

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'studyStats.quizzesTaken': 1 },
      $set: { 'studyStats.averageQuizScore': newAverage }
    });

    // Log study session
    await StudySession.create({
      user: req.user._id,
      note: quiz.note,
      activityType: 'quiz',
      duration: Math.ceil(timeTaken / 60) || 1,
      performance: {
        score: quiz.score,
        accuracy: (correctCount / quiz.totalQuestions) * 100
      }
    });

    res.json({
      success: true,
      quiz,
      score: quiz.score,
      correctCount,
      totalQuestions: quiz.totalQuestions
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to submit quiz' 
    });
  }
};