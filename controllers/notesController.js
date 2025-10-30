import Note from '../models/Note.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import { parsePDF, parseDOCX, parseText } from '../services/pdfParser.js';
import { generateSummary, generateKeyPoints } from '../services/aiService.js';

export const uploadNote = async (req, res) => {
  try {
    const { title, subject, tags, content } = req.body;
    let noteContent = content || '';
    let fileUrl = null;
    let fileType = 'text';
    let metadata = {};

    // If file uploaded
    if (req.file) {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { 
            resource_type: 'raw',
            folder: 'study-notes',
            public_id: `${req.user._id}_${Date.now()}`
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      fileUrl = result.secure_url;
      fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 
                 req.file.mimetype.includes('word') ? 'docx' : 'txt';

      // Parse content based on file type
      if (fileType === 'pdf') {
        const parsed = await parsePDF(req.file.buffer);
        noteContent = String(parsed.text || '');
        metadata.pageCount = parsed.pages;
      } else if (fileType === 'docx') {
        const parsed = await parseDOCX(req.file.buffer);
        noteContent = String(parsed.text || '');
      } else {
        noteContent = req.file.buffer.toString('utf-8');
      }
    }

    // Ensure noteContent is a string before using split
    noteContent = String(noteContent || '');
    metadata.wordCount = noteContent.trim().split(/\s+/).filter(word => word.length > 0).length;

    // Only generate summary and key points if there's content
    let summary = '';
    let keyPoints = [];
    
    if (noteContent.trim().length > 0) {
      summary = await generateSummary(noteContent);
      keyPoints = await generateKeyPoints(noteContent);
    }

    // Create note
    const note = await Note.create({
      user: req.user._id,
      title: title || 'Untitled Note',
      content: noteContent,
      fileUrl,
      fileType,
      subject,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      metadata,
      summary,
      keyPoints
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'studyStats.notesUploaded': 1 }
    });

    res.status(201).json({
      success: true,
      note
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getNotes = async (req, res) => {
  try {
    const { subject, search, sortBy = '-createdAt' } = req.query;
    
    const query = { user: req.user._id };
    
    if (subject) query.subject = subject;
    if (search) query.$text = { $search: search };

    const notes = await Note.find(query)
      .sort(sortBy)
      .select('-content -embeddings');

    res.json({
      success: true,
      count: notes.length,
      notes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({
      success: true,
      note
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNote = async (req, res) => {
  try {
    const { title, subject, tags } = req.body;
    
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, subject, tags: tags ? tags.split(',').map(t => t.trim()) : [] },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json({
      success: true,
      note
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Delete from Cloudinary if exists
    if (note.fileUrl) {
      const publicId = note.fileUrl.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};