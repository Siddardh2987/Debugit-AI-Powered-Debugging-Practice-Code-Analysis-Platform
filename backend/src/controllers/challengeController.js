import Challenge from '../models/Challenge.js';
import Submission from '../models/Submission.js';
import ChallengeChat from '../models/ChallengeChat.js';
import { evaluateSubmission } from '../services/evaluator.js';
import { updateStatsAfterSubmission, incrementStat } from '../controllers/statsController.js';
import { getAI } from '../services/gemini.js';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const isDbConnected = () => Challenge.db.readyState === 1;


const findChallenge = async (id) => {
  let challenge = null;
  if (isDbConnected() && id.match(/^[0-9a-fA-F]{24}$/)) {
    challenge = await Challenge.findById(id).lean();
  }
  if (!challenge) {
    console.warn(`⚠️ Challenge not found in database: ${id}`);
  }
  return challenge;
};

const sanitizeFileForClient = (file = {}) => ({
  filename: file.filename || '',
  language: file.language || 'javascript',
  type: file.type || 'buggy',
  buggyCode: file.buggyCode || file.content || ''
});


const sanitizeChallengeForClient = (challenge = {}) => ({
  _id: challenge._id || challenge.id,
  title: challenge.title || '',
  description: challenge.description || '',
  category: challenge.category || '',
  difficulty: challenge.difficulty || 'medium',
  tags: challenge.tags || [],
  solvers: challenge.solvers || 0,
  accuracy: challenge.accuracy || 0,
  hint: challenge.hints?.find(h => h.level === 1)?.text || challenge.hint || '',
  hints: (challenge.hints || []).map(h => ({
    level: h.level,
    text: h.text
  })),
  files: (challenge.files || []).map(sanitizeFileForClient)

});

const buildFeedback = (result = {}, challenge = {}) => {
  const score = Number(result.score) || 0;
  const perFile = Array.isArray(result.perFile) ? result.perFile : [];

  const allFixed = perFile.length > 0 && perFile.every(f => f.fixed === true);
  const fixedCount = perFile.filter(f => f.fixed === true).length;

  let feedback = '';
  const strengths = [];
  const improvements = [];


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


const getChallenges = async (req, res) => {
  const { category, difficulty, q } = req.query;

  try {
    let query = {};
    if (category && category !== 'all') query.category = category;
    if (difficulty && difficulty !== 'all') query.difficulty = difficulty;
    if (q) {
      query.$or = [
        
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

const getChallengeById = async (req, res) => {
  try {
    const challenge = await findChallenge(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    
    const sanitized = sanitizeChallengeForClient(challenge);

    res.json(sanitized);
  } catch (err) {
    console.error('getChallengeById error:', err.message);
    res.status(500).json({ message: err.message });
  }
};


const saveChallengeChatHistory = async (userId, challengeId, messages) => {
  try {
    if (!userId || !challengeId) return;
    const limitedMessages = messages.slice(-20);
    await ChallengeChat.findOneAndUpdate(
      { userId, challengeId },
      { $set: { chatHistory: limitedMessages } }, 
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('Failed to save challenge chat history:', err.message);
  }
};


const getChallengeHint = async (req, res) => {
  const { id } = req.params;
  const { filename, userCode, chatHistory = [], userMessage, hintLevel } = req.body;

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

    if (req.user) {
      if (!userMessage) {
        incrementStat(req.user._id, 'hintsUsed').catch(e => console.warn('hintsUsed increment failed:', e.message));
      }
      incrementStat(req.user._id, 'questionsAsked').catch(e => console.warn('questionsAsked increment failed:', e.message));
    }

    const ai = getAI();

    let finalHintText = '';

    
    if (!ai || !userMessage) {
      finalHintText = levelHint
        ? `${level === 1 ? '💡' : level === 2 ? '🔍' : '🎯'} **Level ${level} Hint:** ${levelHint.text}`
        : getStaticHint(filename, level, challenge);
    } else {
      const buggyCode = file ? (file.buggyCode || file.content || '') : '';
      
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


const submitChallenge = async (req, res) => {
  const { id } = req.params;
  const { files: submittedFiles } = req.body;
  const userId = req.user ? req.user._id : null;

  if (!submittedFiles || typeof submittedFiles !== 'object') {
    return res.status(400).json({ message: 'Submitted files are required and must be an object' });
  }

  try {
    const challenge = await findChallenge(id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found.' });
    }

    const evalResult = await evaluateSubmission(challenge, submittedFiles);

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

function getStaticHint(filename, level = 1, challenge) {
  const levelPrefix = level === 1 ? '💡' : level === 2 ? '🔍' : '🎯';

  if (challenge) {
    if (Array.isArray(challenge.hints) && challenge.hints.length > 0) {
      const matchHint = challenge.hints.find(h => h.level === level);
      if (matchHint && matchHint.text) {
        return `${levelPrefix} Level ${level} Hint: ${matchHint.text}`;
      }
    }
    if (challenge.hint) {
      return `${levelPrefix} Level ${level} Hint: ${challenge.hint}`;
    }
  }

  return `${levelPrefix} ${level === 1
    ? `Look carefully at the logic in ${filename}.`
    : level === 2
      ? `Trace the data flow through ${filename}.`
      : `Compare each line in ${filename} against the correct behavior.`
  }`;
}


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

export { getChallenges, getChallengeById, getChallengeHint, submitChallenge, getChallengeChat, deleteChallengeChat };