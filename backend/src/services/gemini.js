import { GoogleGenAI } from '@google/genai';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let ai = null;

// ─── Initialize Gemini AI Client ─────────────────────────────────────────────

const getAI = () => {
  if (!ai) {
    
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (key) {
      try {
        const maskedKey = key.length > 10 
          ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` 
          : 'invalid-length';
        console.log(`🤖 Gemini AI client initializing with key: ${maskedKey}`);
        ai = new GoogleGenAI({ apiKey: key });
        console.log('✅ Gemini AI client initialized successfully.');
      } catch (err) {
        console.error('❌ Failed to initialize Gemini client:', err.message);
        ai = null; 
      }
    } else {
      console.warn('⚠️ No GEMINI_API_KEY or API_KEY found in process.env');
    }
  }
  return ai;
};

// ─── Utility: Delay Helper ──────────────────────────────────────────────────

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Generate Content with Retry ────────────────────────────────────────────

/**
 * Generate content using Gemini, with retry on rate-limit errors.
 * Sequential usage: await each call before starting the next.
 * 
 * @param {string} prompt - The prompt to send to Gemini
 * @param {Object} options - Configuration options
 * @param {boolean} options.json - If true, request JSON response format
 * @returns {Promise<string>} Generated content text
 * @throws {Error} If API call fails or no API key is configured
 */
const generateContent = async (prompt, options = {}) => {
  const client = getAI();
  if (!client) {
    throw new Error('GEMINI_API_KEY not configured. Cannot call Gemini.');
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error('Prompt must be a non-empty string');
  }

  const config = {};
  if (options.json) {
    config.responseMimeType = 'application/json';
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`📤 Gemini call (attempt ${attempt}/2): Sending prompt (${prompt.length} chars)`);
      
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(Object.keys(config).length > 0 ? { config } : {})
      });

      if (!response || !response.text) {
        throw new Error('Empty response from Gemini API');
      }

      console.log(`✅ Gemini call succeeded: ${response.text.length} chars returned`);
      return response.text.trim();
      
    } catch (err) {
      
      const isRateLimit = err.message && (
        err.message.includes('429') ||
        err.message.includes('quota') ||
        err.message.includes('rate') ||
        err.message.includes('RESOURCE_EXHAUSTED')
      );

      if (isRateLimit && attempt < 2) {
        console.warn(`⏳ Rate limit detected. Retrying in 5s...`);
        await delay(5000);
      } else {
        console.error(`❌ API call failed (attempt ${attempt}):`, err.message);
        throw err;
      }
    }
  }
};

export { getAI, generateContent, delay };