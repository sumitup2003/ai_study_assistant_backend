import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.HUGGINGFACE_API_KEY) {
  console.error('❌ HUGGINGFACE_API_KEY is not set');
  process.exit(1);
}

export const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);