import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in .env file');
  process.exit(1);
}

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Try these models in order of preference
export const MODEL_NAME = 'gemini-2.5-flash'; // Fastest and free