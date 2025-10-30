import { groq, MODEL } from '../config/groq.js';

// Helper function to clean and extract JSON from AI responses
const extractJSON = (text) => {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Remove any text before the first [ or {
  cleaned = cleaned.replace(/^[^[\{]*/, '');
  
  // Remove any text after the last ] or }
  cleaned = cleaned.replace(/[^\]\}]*$/, '');
  
  // Find JSON array or object
  const jsonMatch = cleaned.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  return cleaned;
};

// Helper function to retry on rate limit
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 503 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

export const generateSummary = async (text) => {
  try {
    const completion = await retryWithBackoff(() => groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful study assistant. Create clear, concise summaries."
        },
        {
          role: "user",
          content: `Summarize this study material in 3-5 paragraphs:\n\n${text.substring(0, 15000)}`
        }
      ],
      max_tokens: 600,
      temperature: 0.7
    }));
    
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Summary error:', error);
    throw new Error(`Summary generation failed: ${error.message}`);
  }
};

export const generateKeyPoints = async (text) => {
  try {
    const completion = await retryWithBackoff(() => groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Extract key points. Return ONLY a JSON array of strings, nothing else."
        },
        {
          role: "user",
          content: `Extract 5-10 key points. Return format: ["point 1", "point 2", "point 3"]\n\n${text.substring(0, 15000)}`
        }
      ],
      max_tokens: 400,
      temperature: 0.5
    }));
    
    const response = completion.choices[0].message.content;
    
    try {
      const jsonStr = extractJSON(response);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 10).map(p => String(p));
      }
    } catch (e) {
      console.error('JSON parse error:', e);
    }
    
    // Fallback
    const points = response.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-*•\d.)\s"']+/, '').replace(/["']+$/, '').trim())
      .filter(line => line.length > 10)
      .slice(0, 10);
    
    return points.length > 0 ? points : ['Key points extracted from material'];
  } catch (error) {
    console.error('Key points error:', error);
    return ['Unable to generate key points'];
  }
};

export const generateFlashcards = async (text, count = 10) => {
  try {
    const completion = await retryWithBackoff(() => groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a flashcard generator. Return ONLY valid JSON array, no other text."
        },
        {
          role: "user",
          content: `Create ${count} flashcards. Return this exact format:
[
  {"question": "What is X?", "answer": "X is...", "difficulty": "easy"},
  {"question": "What is Y?", "answer": "Y is...", "difficulty": "medium"}
]

Material: ${text.substring(0, 10000)}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    }));
    
    const response = completion.choices[0].message.content;
    console.log('Flashcards raw response:', response.substring(0, 200));
    
    try {
      const jsonStr = extractJSON(response);
      const parsed = JSON.parse(jsonStr);
      
      if (Array.isArray(parsed)) {
        return parsed.slice(0, count).map(card => ({
          question: String(card.question || 'Question'),
          answer: String(card.answer || 'Answer'),
          difficulty: String(card.difficulty || 'medium')
        }));
      }
    } catch (e) {
      console.error('Flashcard JSON parse error:', e);
      console.error('Response was:', response);
    }
    
    // Fallback: Create simple flashcards from text
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const fallbackCards = [];
    
    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      fallbackCards.push({
        question: `What can you tell me about: ${sentences[i].substring(0, 50)}...?`,
        answer: sentences[i].trim(),
        difficulty: 'medium'
      });
    }
    
    if (fallbackCards.length > 0) {
      return fallbackCards;
    }
    
    throw new Error('Unable to generate flashcards');
  } catch (error) {
    console.error('Flashcard error:', error);
    throw new Error(`Flashcard generation failed: ${error.message}`);
  }
};

export const generateQuiz = async (text, questionCount = 5) => {
  try {
    const completion = await retryWithBackoff(() => groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. Return ONLY valid JSON array, no other text or explanations."
        },
        {
          role: "user",
          content: `Create ${questionCount} multiple-choice questions. Return this exact format:
[
  {
    "question": "What is X?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Because..."
  }
]

Material: ${text.substring(0, 10000)}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    }));
    
    const response = completion.choices[0].message.content;
    console.log('Quiz raw response:', response.substring(0, 200));
    
    try {
      const jsonStr = extractJSON(response);
      const parsed = JSON.parse(jsonStr);
      
      if (Array.isArray(parsed)) {
        return parsed.slice(0, questionCount).map(q => ({
          question: String(q.question || 'Question'),
          options: Array.isArray(q.options) ? q.options.map(o => String(o)) : ['A', 'B', 'C', 'D'],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: String(q.explanation || 'Explanation not available')
        }));
      }
    } catch (e) {
      console.error('Quiz JSON parse error:', e);
      console.error('Response was:', response);
    }
    
    throw new Error('Unable to parse quiz questions');
  } catch (error) {
    console.error('Quiz error:', error);
    throw new Error(`Quiz generation failed: ${error.message}`);
  }
};

export const answerQuestion = async (question, context) => {
  try {
    const completion = await retryWithBackoff(() => groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Answer questions based on the study material provided. Be clear and concise."
        },
        {
          role: "user",
          content: `Material: ${context.substring(0, 12000)}\n\nQuestion: ${question}\n\nAnswer:`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    }));
    
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Answer error:', error);
    throw new Error(`Question answering failed: ${error.message}`);
  }
};