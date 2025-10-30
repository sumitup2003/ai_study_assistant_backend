import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String // Cloudinary URL
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'txt', 'text'],
    default: 'text'
  },
  subject: {
    type: String,
    trim: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  // For vector search (embeddings)
  embeddings: [{
    chunk: String,
    embedding: [Number],
    chunkIndex: Number
  }],
  metadata: {
    wordCount: Number,
    pageCount: Number,
    uploadedAt: { type: Date, default: Date.now }
  },
  summary: {
    type: String
  },
  keyPoints: [{
    type: String
  }]
}, {
  timestamps: true
});

// Text index for search
noteSchema.index({ title: 'text', content: 'text', subject: 'text' });

export default mongoose.model('Note', noteSchema);