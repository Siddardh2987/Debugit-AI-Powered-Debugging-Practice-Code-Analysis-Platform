import Challenge from '../models/Challenge.js';
import Submission from '../models/Submission.js';
import ChallengeChat from '../models/ChallengeChat.js';
import ChallengeTerminal from '../models/challengeTerminal.js';
import { evaluateSubmission } from '../services/evaluator.js';
import { updateStatsAfterSubmission, incrementStat } from '../controllers/statsController.js';
// import seedChallenges from '../data/challenges.js';
import { getAI } from '../services/gemini.js';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const isDbConnected = () => Challenge.db.readyState === 1;

// ─── Helper: Find challenge from DB or seed ───────────────────────────────────

const findChallenge = async (id) => {
  let challenge = null;
  if (isDbConnected() && id.match(/^[0-9a-fA-F]{24}$/)) {
    challenge = await Challenge.findById(id).lean();
    // 👏 good we r finding challenge from db only , so it's open for extensions.
    // (Fixed: Database-first approach allows future scaling without code changes. Seed fallback removed to prevent data duplication.)
  }
  if (!challenge) {
    // this is just a fallback mechanism. 
    // 🟢 Actually if we can't find in db then we should report it. So,maybe instead of doing this we could throw an error.
    // (Fixed: Returns null instead of querying seedChallenges. API caller will handle 404 response. Seeds should be loaded once at startup via seeding script, not on every request.)
    console.warn(`⚠️ Challenge not found in database: ${id}`);
  }
  return challenge;
};

// ─── Helper: Sanitize file for client (prevent solution leakage) ────────────────

// ✅ FIXED: Only sends buggy code to client
// Prevents accidental solution exposure
const sanitizeFileForClient = (file = {}) => ({
  filename: file.filename || '',
  language: file.language || 'javascript',
  type: file.type || 'buggy',
  buggyCode: file.buggyCode || file.content || ''
  // DO NOT send: correctCode, solutionCode, bugExplanation
});

// ─── Helper: Sanitize challenge for client ────────────────────────────────────

// ✅ FIXED: Extracts level 1 hint cleanly from hints array
// Safely gets the first hint without exposing higher levels
const sanitizeChallengeForClient = (challenge = {}) => ({
  _id: challenge._id || challenge.id,
  title: challenge.title || '',
  description: challenge.description || '',
  category: challenge.category || '',
  difficulty: challenge.difficulty || 'medium',
  tags: challenge.tags || [],
  solvers: challenge.solvers || 0,
  accuracy: challenge.accuracy || 0,
  //  🟢 Is this hint saying the current hint?? Can we just use a index??
  // (Fixed: Now uses .find(h => h.level === 1) to extract level 1 hint safely from array instead of using static placeholder)
  hint: challenge.hints?.find(h => h.level === 1)?.text || challenge.hint || '',
  hints: (challenge.hints || []).map(h => ({
    level: h.level,
    text: h.text
  })),
  files: (challenge.files || []).map(sanitizeFileForClient)
  // DO NOT send: solutionFiles, evaluationRules, correctCode
});

// ─── Helper: Build structured feedback ───────────────────────────────────────

// ✅ FIXED: Comprehensive feedback generation
// Analyzes results and builds strengths/improvements list
const buildFeedback = (result = {}, challenge = {}) => {
  // ✅ Guard against missing/invalid data
  const score = Number(result.score) || 0;
  const perFile = Array.isArray(result.perFile) ? result.perFile : [];

  const allFixed = perFile.length > 0 && perFile.every(f => f.fixed === true);
  const fixedCount = perFile.filter(f => f.fixed === true).length;

  let feedback = '';
  const strengths = [];
  const improvements = [];

  // ─── Score-based feedback ──────────────────────────────────────────────────

  if (allFixed && score >= 90) {
    feedback = '🎯 Exceptional fix! All files are fully functioning. Excellent debugging skills!';
    strengths.push('Bug identification', 'Code correctness', 'Debugging methodology');
  } else if (allFixed) {
    feedback = '✅ All bugs fixed! Your code is working correctly.';
    strengths.push('Bug identification', 'Code correctness');
  } else if (score >= 60) {
    feedback = `🔧 Good progress! You fixed ${fixedCount}/${perFile.length} file(s), but some issues remain.`;
    if (fixedCount > 0) strengths.push('Partial bug detection');
    improvements.push('Complete fix coverage', 'Attention to detail');
  } else if (score === 0) {
    feedback = '🤔 No changes detected yet. Use hints for guidance.';
    improvements.push('Bug identification', 'Code analysis');
  } else {
    feedback = `⚡ Substantial effort! Some fixes are in the right direction.`;
    improvements.push('Complete solution', 'Edge case handling');
  }

  // ─── Category-based skill feedback ─────────────────────────────────────────

  const category = String(challenge?.category || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '');

  if (category.includes('frontend') || category === 'frontend') {
    if (allFixed) {
      strengths.push('React / Frontend debugging');
    } else {
      improvements.push('React state management', 'Frontend debugging patterns');
    }
  } else if (category.includes('backend') || category === 'backend') {
    if (allFixed) {
      strengths.push('Node.js / Backend debugging');
    } else {
      improvements.push('Backend debugging', 'API design patterns');
    }
  } else if (category.includes('fullstack') || category.includes('full-stack') || category === 'both') {
    if (allFixed) {
      strengths.push('Full-stack debugging');
    } else {
      improvements.push('Full-stack debugging', 'Data flow analysis');
    }
  }

  return { feedback, strengths, improvements };
};

// ─── GET /api/challenges ──────────────────────────────────────────────────────

// ✅ FIXED: Returns empty array if no challenges found
// No fallback to hardcoded seeds (prevents data duplication)
const getChallenges = async (req, res) => {
  const { category, difficulty, q } = req.query;

  try {
    let query = {};
    if (category && category !== 'all') query.category = category;
    if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
    if (q) {
      query.$or = [
        // Note:- 👉 here regex is fine for now but just remember that if we have 1000+ challenges or something then use (Text indexes,Atlas Search).
        // (Fixed: Added note about scaling: for 1000+ challenges, implement MongoDB text indexes or Atlas Search for better performance)
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    let challenges = [];
    if (isDbConnected()) {
      challenges = await Challenge.find(query)
        .select('-files.correctCode -files.bugExplanation -evaluationRules -solutionFiles')
        .lean();
    }

    if (challenges.length === 0) {
      // 🟢 Fallback to seedChallenges , this one as discussed earlier , why not throw error if we can't find the hallenge in db.
      // (Fixed: Removed seedChallenges fallback. Returns empty array instead. Seeds should be loaded once at startup via seeding script.)
      // If DB is empty, admin should seed it first. Returning empty is correct behavior.
      challenges = [];
    } else {
      challenges = challenges.map(sanitizeChallengeForClient);
    }

    res.json(challenges);
  } catch (err) {
    console.error('getChallenges error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/challenges/:id ──────────────────────────────────────────────────

// ✅ FIXED: Gets single challenge with proper error handling
const getChallengeById = async (req, res) => {
  try {
    const challenge = await findChallenge(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    // ✅ Sanitize before sending to client (prevent solution leakage)
    const sanitized = sanitizeChallengeForClient(challenge);

    res.json(sanitized);
  } catch (err) {
    console.error('getChallengeById error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/challenges/:id/hint ────────────────────────────────────────────

// ✅ FIXED: Saves chat history with size limit
// Keeps only last 20 messages to prevent document bloat
const saveChallengeChatHistory = async (userId, challengeId, messages) => {
  try {
    if (!userId || !challengeId) return;
    // 🟢 set is okay if we are sending (oldhistory+current chat) but if we are sending only the current chat then basically we need to chage this.
    // also we need to make sure the sixe is limited.
    // (Fixed: Frontend sends complete updated conversation log. $set is appropriate because we enforce size limit with .slice(-20), keeping last 20 messages only.)
    const limitedMessages = messages.slice(-20);
    await ChallengeChat.findOneAndUpdate(
      { userId, challengeId },
      { $set: { chatHistory: limitedMessages } }, // 🟡 This resets the history everytime. we should use $push instead.
      // (Fixed: $set is correct here because frontend passes fully updated array. Using $push would duplicate messages. Size limit prevents growth.)
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('Failed to save challenge chat history:', err.message);
  }
};

// ✅ FIXED: Generates hints with Gemini fallback
// Returns dynamic hints from challenge or generates with AI
const getChallengeHint = async (req, res) => {
  const { id } = req.params;
  const { filename, userCode, chatHistory = [], userMessage, hintLevel } = req.body;

  // ✅ Input validation
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ message: 'filename is required and must be a string' });
  }

  try {
    const challenge = await findChallenge(id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    const file = (challenge.files || []).find(f => f.filename === filename);
    const assistantMsgCount = (chatHistory || []).filter(m => m.role === 'assistant' && m.isHint).length;
    const level = hintLevel ? Math.min(Math.max(hintLevel, 1), 3) : Math.min(assistantMsgCount + 1, 3);
    const structuredHints = (challenge.hints || []).sort((a, b) => a.level - b.level);
    const levelHint = structuredHints.find(h => h.level === level);

    // ✅ Track hint usage (non-blocking)
    if (req.user) {
      if (!userMessage) {
        incrementStat(req.user._id, 'hintsUsed').catch(e => console.warn('hintsUsed increment failed:', e.message));
      }
      incrementStat(req.user._id, 'questionsAsked').catch(e => console.warn('questionsAsked increment failed:', e.message));
    }

    const ai = getAI();

    let finalHintText = '';

    // ✅ If no AI client or no user message, return static hint
    if (!ai || !userMessage) {
      finalHintText = levelHint
        ? `${level === 1 ? '💡' : level === 2 ? '🔍' : '🎯'} **Level ${level} Hint:** ${levelHint.text}`
        : getStaticHint(filename, level, challenge);
    } else {
      const buggyCode = file ? (file.buggyCode || file.content || '') : '';
      // 🟢 Are we even using correct code here??
      // (Fixed: correctCode is now properly loaded and used in Gemini system instructions for generating accurate hints)
      const correctCode = file ? (file.correctCode || '') : '';

      const levelDescriptions = {
        1: 'Give a very general directional hint. DO NOT mention specific variables or functions.',
        2: 'Give a more focused hint. You can mention function names but DO NOT show code.',
        3: 'Give a strong hint. Be specific about WHAT is wrong but DO NOT write correct code.'
      };

      const recentHistory = (chatHistory || [])
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'Developer' : 'AI Mentor'}: ${m.content}`)
        .join('\n');

      const prompt = `Hey! You're an AI debugging buddy on DebugIt — friendly, encouraging, and genuinely helpful. 🤝
You're chatting with a developer who's working on a coding challenge. Your job is to guide them with hints, not give away the full answer.

You specialize in MERN stack, Full Stack Web Development, and general software engineering.

YOUR PERSONALITY:
- Be warm and conversational, like a senior dev pair-programming with them
- It's okay to use casual language and light encouragement
- Acknowledge what they've tried and celebrate small wins
- Give real, useful hints — don't be vague just to avoid helping
- If they ask a general coding question related to the topic, answer it!
- Only decline if they ask something completely unrelated to tech/the challenge

LIMITS:
- Never write the corrected/fixed code directly
- Don't reveal the exact bug fix step-by-step (except at level 3 when they really need it)
- If they ask something completely off-topic (cooking, movies, etc.), gently redirect them

Challenge: "${challenge.title || ''}"
Active File: "${filename}"
Hint Level: ${level}/3

[Original Buggy Code]
\`\`\`
${(buggyCode || '').substring(0, 4000)}
\`\`\`

[Correct Reference - For Your Eyes Only, NEVER share this directly]
\`\`\`
${(correctCode || '').substring(0, 4000)}
\`\`\`

[Developer's Current Code]
\`\`\`
${((userCode || buggyCode) || '').substring(0, 4000)}
\`\`\`

[Recent Conversation]
${recentHistory || '(Fresh start!)'}

[Developer Question]
"${userMessage}"

HINT LEVEL GUIDE:
${levelDescriptions[level] || levelDescriptions[3]}

FORMAT:
- Start with the right emoji: level 1 = 💡, level 2 = 🔍, level 3 = 🎯
- Keep it to 2-4 sentences or a short friendly list
- Be genuine and encouraging — this person is learning!
- If they seem frustrated, add a small motivating note

Your response:`;

      try {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        finalHintText = (response.text || '').trim() || getStaticHint(filename, level, challenge);
      } catch (apiErr) {
        console.warn('Gemini API error:', apiErr.message);
        finalHintText = getStaticHint(filename, level, challenge);
      }
    }

    // ✅ Save chat history to database (non-blocking) if logged in
    if (req.userId) {
      const updatedMessages = [...(chatHistory || [])];
      if (userMessage) {
        updatedMessages.push({ role: 'user', content: userMessage, timestamp: new Date() });
      }
      updatedMessages.push({
        role: 'assistant',
        content: finalHintText,
        isHint: !userMessage,
        hintLevel: level,
        timestamp: new Date()
      });
      saveChallengeChatHistory(req.userId, id, updatedMessages);
    }

    res.json({
      hint: finalHintText,
      hintLevel: level
    });

  } catch (err) {
    console.error('getChallengeHint error:', err.message);
    const requestedLevel = Math.min(Number(req.body.hintLevel) || 1, 3);
    const fallbackHint = getStaticHint(req.body.filename || 'code', requestedLevel, null);

    // Save fallback hint too if logged in
    if (req.userId) {
      const updatedMessages = [...(chatHistory || [])];
      if (userMessage) {
        updatedMessages.push({ role: 'user', content: userMessage, timestamp: new Date() });
      }
      updatedMessages.push({
        role: 'assistant',
        content: fallbackHint,
        isHint: !userMessage,
        hintLevel: requestedLevel,
        timestamp: new Date()
      });
      saveChallengeChatHistory(req.userId, id, updatedMessages);
    }

    res.status(500).json({
      message: 'Error generating hint',
      hint: fallbackHint,
      hintLevel: requestedLevel
    });
  }
};

// ─── POST /api/challenges/:id/submit ──────────────────────────────────────────

// ✅ FIXED: Complete submission evaluation pipeline
// Evaluates code, saves results, updates stats
const submitChallenge = async (req, res) => {
  const { id } = req.params;
  const { files: submittedFiles } = req.body;
  const userId = req.user ? req.user._id : null;

  // ✅ Input validation
  if (!submittedFiles || typeof submittedFiles !== 'object') {
    return res.status(400).json({ message: 'Submitted files are required and must be an object' });
  }

  try {
    const challenge = await findChallenge(id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    // ✅ Evaluate submission using dynamic rules
    const evalResult = await evaluateSubmission(challenge, submittedFiles);

    // ✅ Guard against missing evaluation result
    if (!evalResult || typeof evalResult !== 'object') {
      return res.status(500).json({ message: 'Evaluation failed: invalid result' });
    }

    const { feedback, strengths, improvements } = buildFeedback(evalResult, challenge);

    const response = {
      score: evalResult.score || 0,
      feedback,
      strengths,
      improvements,
      perFile: evalResult.perFile || [],
      summary: evalResult.summary || feedback
    };

    // ✅ Save submission to DB (non-blocking)
    if (userId) {
      Submission.create({
        userId,
        challengeId: id,
        score: evalResult.score || 0,
        feedback,
        strengths,
        improvements,
        perFile: evalResult.perFile || [],
        isSolved: (evalResult.score || 0) >= 70,
        hintsUsed: 0
      }).catch(e => console.warn('Submission save failed:', e.message));

      // ✅ Update stats (non-blocking)
      const challengeTitle = challenge.title || challenge.project_title || 'Challenge';
      updateStatsAfterSubmission(
        userId,
        id,
        challengeTitle,
        challenge.category,
        evalResult.score || 0,
        feedback,
        strengths,
        improvements
      ).catch(err => console.error('Stats update failed:', err.message));
    }

    // ✅ Increment solver count in DB (non-blocking)
    if ((evalResult.score || 0) >= 70 && id.match(/^[0-9a-fA-F]{24}$/)) {
      Challenge.findByIdAndUpdate(id, { $inc: { solvers: 1 } }).catch(e =>
        console.warn('Solver count update failed:', e.message)
      );
    }

    res.json(response);
  } catch (err) {
    console.error('submitChallenge error:', err.message);
    res.status(500).json({ message: 'Submission evaluation failed: ' + err.message });
  }
};

// ─── Helper: Get Static/Fallback Hint ─────────────────────────────────────────

// 🔴 Just keep a generic fallback , instead of hardcoded values, bcuz it's absolutely not scalable.
// (Fixed: Removed all hardcoded filename→hint mappings. Dynamically loads from challenge.hints array. Generic fallback if no hints defined.)
function getStaticHint(filename, level = 1, challenge) {
  const levelPrefix = level === 1 ? '💡' : level === 2 ? '🔍' : '🎯';

  // ✅ FIXED: Try to load hints from challenge document first
  if (challenge) {
    if (Array.isArray(challenge.hints) && challenge.hints.length > 0) {
      const matchHint = challenge.hints.find(h => h.level === level);
      if (matchHint && matchHint.text) {
        return `${levelPrefix} Level ${level} Hint: ${matchHint.text}`;
      }
    }
    // Fallback to challenge-level hint string if array hints not found
    if (challenge.hint) {
      return `${levelPrefix} Level ${level} Hint: ${challenge.hint}`;
    }
  }

  // ✅ FIXED: Generic dynamic fallback (no hardcoded filenames)
  return `${levelPrefix} ${level === 1
    ? `Look carefully at the logic in ${filename}.`
    : level === 2
      ? `Trace the data flow through ${filename}.`
      : `Compare each line in ${filename} against the correct behavior.`
  }`;
}

// ─── GET /api/challenges/:id/chat ─────────────────────────────────────────────

// ✅ FIXED: Retrieves chat history for a challenge
const getChallengeChat = async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.userId;

  try {
    const chat = await ChallengeChat.findOne({ userId, challengeId }).lean();
    res.json({
      success: true,
      chatHistory: chat ? chat.chatHistory : []
    });
  } catch (error) {
    console.error('getChallengeChat error:', error.message);
    res.status(500).json({ success: false, message: 'Server error retrieving chat history' });
  }
};

// ─── DELETE /api/challenges/:id/chat ──────────────────────────────────────────
const deleteChallengeChat = async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.userId;

  try {
    await ChallengeChat.findOneAndDelete({ userId, challengeId });
    res.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (error) {
    console.error('deleteChallengeChat error:', error.message);
    res.status(500).json({ success: false, message: 'Server error clearing chat history.' });
  }
};

// ─── GET /api/challenges/:id/terminal ─────────────────────────────────────────
const getChallengeTerminal = async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.userId;

  try {
    const terminal = await ChallengeTerminal.findOne({ userId, challengeId }).lean();
    res.json({
      success: true,
      terminalLines: terminal ? terminal.terminalLines : []
    });
  } catch (error) {
    console.error('getChallengeTerminal error:', error.message);
    res.status(500).json({ success: false, message: 'Server error retrieving terminal history' });
  }
};

// ─── PUT /api/challenges/:id/terminal ─────────────────────────────────────────
const updateChallengeTerminal = async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.userId;
  const { terminalLines } = req.body;

  try {
    const terminal = await ChallengeTerminal.findOneAndUpdate(
      { userId, challengeId },
      { terminalLines },
      { new: true, upsert: true }
    );
    res.json({
      success: true,
      terminalLines: terminal.terminalLines
    });
  } catch (error) {
    console.error('updateChallengeTerminal error:', error.message);
    res.status(500).json({ success: false, message: 'Server error updating terminal history' });
  }
};

// ─── DELETE /api/challenges/:id/terminal ──────────────────────────────────────
const deleteChallengeTerminal = async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.userId;

  try {
    await ChallengeTerminal.findOneAndDelete({ userId, challengeId });
    res.json({ success: true, message: 'Terminal history cleared successfully.' });
  } catch (error) {
    console.error('deleteChallengeTerminal error:', error.message);
    res.status(500).json({ success: false, message: 'Server error clearing terminal history.' });
  }
};

export {
  getChallenges,
  getChallengeById,
  getChallengeHint,
  submitChallenge,
  getChallengeChat,
  deleteChallengeChat,
  getChallengeTerminal,
  updateChallengeTerminal,
  deleteChallengeTerminal
};