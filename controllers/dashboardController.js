import User from '../models/User.js';
import Note from '../models/Note.js';
import StudySession from '../models/StudySession.js';
import Quiz from '../models/Quiz.js';
import Flashcard from '../models/Flashcard.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with stats
    const user = await User.findById(userId);

    // Get additional stats
    const notesCount = await Note.countDocuments({ user: userId });
    const flashcardsCount = await Flashcard.countDocuments({ user: userId });
    const masteredFlashcards = await Flashcard.countDocuments({ 
      user: userId, 
      mastered: true 
    });
    const quizzesCount = await Quiz.countDocuments({ user: userId, completed: true });

    // Get recent activity
    const recentSessions = await StudySession.find({ user: userId })
      .sort('-date')
      .limit(10)
      .populate('note', 'title');

    // Calculate total study time this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekSessions = await StudySession.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    const weekStudyTime = weekSessions[0]?.totalDuration || 0;

    res.json({
      success: true,
      stats: {
        notesUploaded: notesCount,
        flashcardsTotal: flashcardsCount,
        flashcardsMastered: masteredFlashcards,
        quizzesTaken: quizzesCount,
        averageQuizScore: user.studyStats.averageQuizScore,
        totalStudyTime: user.studyStats.totalStudyTime,
        weekStudyTime,
        recentActivity: recentSessions
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudyAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get daily study time
    const dailyStats = await StudySession.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          duration: { $sum: '$duration' },
          sessions: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get activity breakdown
    const activityBreakdown = await StudySession.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    // Get performance trends
    const performanceTrends = await StudySession.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startDate },
          'performance.accuracy': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          avgAccuracy: { $avg: '$performance.accuracy' },
          avgScore: { $avg: '$performance.score' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get subject-wise stats
    const subjectStats = await Note.aggregate([
      {
        $match: { user: userId }
      },
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        dailyStats,
        activityBreakdown,
        performanceTrends,
        subjectStats
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};