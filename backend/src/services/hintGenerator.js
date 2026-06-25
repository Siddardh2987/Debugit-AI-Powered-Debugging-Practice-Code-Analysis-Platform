import { generateContent } from './gemini.js';

const MAX_FILE_CONTEXT_CHARS = 10000;
const MAX_CHAT_HISTORY_TURNS = 6;


// ── Challenge hint generator (Pipeline 2 — Level System) ─────────────────────

/**
 * Generate a leveled hint for a debugging challenge.
 * @param {number} hintLevel - 1 (general) | 2 (focused) | 3 (strong)
 * @param {string} challengeTitle
 * @param {Array<string>} storedHints - Pre-written hints from Challenge model
 * @param {string} userMessage - What the developer asked
 * @returns {string} hint text
 */
//This is for Challenges.
export const generateChallengeHint = async (
  hintLevel,
  challengeTitle,
  storedHints = [],
  userMessage = ''
) => {
  const levelDescriptions = {
    1: 'Give only a general direction. Do NOT mention specific functions, ' +
       'variables, or file names.',
    2: 'Give more focused guidance. You may reference the general area or ' +
       'component where the bug lives.',
    3: 'Give a strong hint. You may reference the specific function name ' +
       'but NOT the actual fix or corrected code.'
  };

  const instruction =
    levelDescriptions[hintLevel] || levelDescriptions[1];

  // Use stored hint as grounding context if available
  const storedHint = storedHints[hintLevel - 1] || '';

  const prompt = `
You are DebugBot — a debugging mentor on DebugIt.
Challenge: "${challengeTitle}"
Hint Level: ${hintLevel} out of 3

Your instruction for this level:
${instruction}

${storedHint ? `Reference hint (do not copy verbatim): "${storedHint}"` : ''}

Developer asked: "${userMessage || 'Give me a hint'}"

Respond with a hint that strictly matches Level ${hintLevel}.
- NEVER reveal the solution or corrected code.
- Give the answer in bullet points.
- Keep it to 300 characters max.
- End with an encouraging guiding question.
  `.trim();

  try {
    const text = await generateContent(prompt);
    return text.trim();
  } catch (err) {
    console.error('❌ Challenge hint generation failed:', err.message);
    return (
      storedHint ||
      `Think carefully about how **${challengeTitle}** handles its core logic. ` +
      `What happens step by step when you trace through it? 💪`
    );
  }
};