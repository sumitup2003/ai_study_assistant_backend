import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function test() {
  try {
    console.log('🧪 Testing Groq API...');
    console.log('API Key:', process.env.GROQ_API_KEY ? 'Set ✓' : 'Missing ✗\n');
    
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: "user", content: "Say hello!" }
      ],
      max_tokens: 50
    });
    
    console.log('✅ Success!');
    console.log('Response:', completion.choices[0].message.content);
    console.log('\n🎉 Groq is working! Your AI Study Assistant is ready!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nGet your free API key at: https://console.groq.com/keys\n');
  }
}

test();