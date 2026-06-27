import { generateContent } from './gemini.js';
import Summary from '../models/Summary.js';
import UploadedFile from '../models/UploadedFile.js';
import UserProject from '../models/UserProject.js';

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

//  ── Project hint generator ──────────────────────────────────────────────────


/**
 * Generate a debugging hint for an uploaded project based on stored summaries.
 * @param {string} projectId - UserProject _id
 * @param {string} userId - Authenticated user's ID (for ownership check)
 * @param {string} userMessage - User's question
 * @param {Array} chatHistory - Prior chat messages [{role, content}]
 * @returns {string} hint text
 */
export const generateProjectHint = async (
  projectId,
  userId,
  userMessage,
  chatHistory = []
) => {
  // ── Load project (scoped to user) + stored summaries ─────────────────────
  const [project, summaries] = await Promise.all([
    UserProject.findOne({ _id: projectId, userId }).lean(),
    Summary.find({ projectId }).sort({ chunkId: 1 }).lean()
  ]);

  if (!project) {
    throw new Error('Project not found or unauthorized');
  }

  const projectTitle = project.title || 'your project';
  const isSummarizing = project.summarizing === true;

  // ── Build context from summaries or fallback to file names ────────────────
  let context = '';

  if (summaries.length === 0) {
    const files = await UploadedFile.find({ projectId })
      .select('fileName')
      .lean();

    if (files.length > 0) {
      const fileList = files.map(f => f.fileName).join(', ');
      context = isSummarizing
        ? `The project "${projectTitle}" is still being analyzed ` +
          `(${files.length} file(s) found: ${fileList}). ` +
          `Summaries will be ready shortly — I'll give a better answer ` +
          `once analysis completes. For now I can see the file names only.`
        : `The project "${projectTitle}" has ${files.length} file(s): ${fileList}. ` +
          `No AI summaries are available yet — try re-uploading or wait ` +
          `for summarization to complete.`;
    } else {
      context =
        `No files or summaries found for this project yet. ` +
        `Please make sure the upload completed successfully.`;
    }
  } else {
    context = summaries
      .map((s, idx) => {
        // Guard: fileNames may not exist on older summary documents
        const fileLabel =
          s.fileNames?.length
            ? `Files: ${s.fileNames.join(', ')}`
            : `Chunk ${idx + 1}`;
        return `[${fileLabel}]\n${s.summary}`;
      })
      .join('\n\n---\n\n');
  }

  // ── Retrieve actual code for files mentioned in the query ─────────────────
  let relevantFilesContext = '';
  try {
    const files = await UploadedFile.find({ projectId })
      .select('fileName content')
      .lean();

    const mentionedFiles = files.filter(f => {
      const baseName = f.fileName.toLowerCase().replace(/\.[^/.]+$/, '');
      const fullName = f.fileName.toLowerCase();
      const query = userMessage.toLowerCase();
      return query.includes(fullName) || query.includes(baseName);
    });

    if (mentionedFiles.length > 0) {
      relevantFilesContext = mentionedFiles
        .map(
          f =>
            `[Active Code Context — File: ${f.fileName}]\n` +
            `${f.content.substring(0, MAX_FILE_CONTEXT_CHARS)}`
        )
        .join('\n\n');
    }
  } catch (err) {
    console.warn('⚠️ Failed to fetch active code context:', err.message);
  }

  // ── Format chat history ───────────────────────────────────────────────────
  const recentHistory = chatHistory.slice(-MAX_CHAT_HISTORY_TURNS);
  const historyText = recentHistory
    .map(m => `${m.role === 'user' ? 'Developer' : 'DebugBot'}: ${m.content}`)
    .join('\n');

  // ── Prompt ────────────────────────────────────────────────────────────────
  const prompt = `
You are DebugBot — a friendly, expert debugging mentor on the DebugIt platform.
A developer has uploaded their project "${projectTitle}" and needs your help debugging it.
Your focus is MERN stack, Full Stack Web Development, AI, and overall software engineering.

━━━ EVALUATION RULES ━━━
1. Determine if the Developer's Question is related to software development,
   programming, computer science, MERN stack, AI, JavaScript, HTML, CSS,
   database concepts, or their uploaded project "${projectTitle}".
2. If the question is NOT related to development or tech at all (e.g. sports,
   cooking, history, movie gossip), politely refuse:
   "I'm here to help you debug your project **${projectTitle}** and discuss
   software development. Let's stay focused on web development, MERN stack,
   or your uploaded files!"
3. If the question IS related to development/tech:
   - Explain it clearly and dynamically (500 characters max).
   - Tie it back to the files or summaries context if applicable.
   - Never write corrected code or give the exact solution.

━━━ PROJECT CODE SUMMARIES ━━━
${context}

━━━ RELEVANT FILE CONTENTS (IF ANY) ━━━
${relevantFilesContext || 'None mentioned directly in this query.'}

━━━ CONVERSATION SO FAR ━━━
${historyText || '(No prior conversation)'}

━━━ DEVELOPER JUST ASKED ━━━
"${userMessage}"

━━━ CRITICAL RULES ━━━
1. NEVER write corrected code or reveal the exact fix.
2. NEVER paste solution code blocks.
3. Guide with hints, questions and concepts only.
4. Keep responses to 500 characters max.
5. Use markdown where helpful — bold key terms, bullet points for lists.
6. Give the answer in bullet points.
7. Plain conversational tone — not robotic or overly formal.
8. Always end with an encouraging line or a guiding question.

Respond now:
`.trim();

  // ── Call Gemini ───────────────────────────────────────────────────────────
  try {
    const text = await generateContent(prompt);
    return text.trim();
  } catch (err) {
    console.error('❌ Hint generation failed:', err.message);
    return (
      `I'm having trouble connecting to the AI right now. ` +
      `Based on your question about "${userMessage}", try reviewing the file ` +
      `that handles that functionality and check for common patterns like ` +
      `incorrect variable names, missing awaits, or wrong data types. ` +
      `You're on the right track — keep debugging! 💪`
    );
  }
};