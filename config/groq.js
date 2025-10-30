import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY is not set in .env file');
  process.exit(1);
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Try different models if one is overloaded
export const MODEL = 'llama-3.1-8b-instant'; // More capacity
// Alternative: 'gemma2-9b-it' or 'llama3-70b-8192'