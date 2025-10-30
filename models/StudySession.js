import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  },
  activityType: {
    type: String,
    enum: ['reading', 'chat', 'quiz', 'flashcard', 'summary'],
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  performance: {
    score: Number,
    accuracy: Number
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

export default mongoose.model('StudySession', studySessionSchema);