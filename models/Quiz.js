import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number, // index of correct option
    explanation: String,
    userAnswer: Number,
    isCorrect: Boolean
  }],
  score: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  timeTaken: {
    type: Number // in seconds
  }
}, {
  timestamps: true
});

export default mongoose.model('Quiz', quizSchema);