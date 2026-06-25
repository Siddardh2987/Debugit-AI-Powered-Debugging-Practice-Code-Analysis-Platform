import { getAI } from './gemini.js';
import { delay, withTimeout } from '../utils/helpers.js';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const getEvaluationRulesForFile = (filename, evaluationRules) => {
  if (!evaluationRules || !Array.isArray(evaluationRules.fileRules)) {
    return null;
  }

  const rule = evaluationRules.fileRules.find(r => r.filename === filename);
  return rule?.evaluation || rule || null;
};

const normalizeSubmittedContents = (submittedContents) => {
  if (Array.isArray(submittedContents)) {
    return submittedContents.reduce((acc, file) => {
      if (!file) return acc;

      const filename = file.filename || file.fileName || file.name;
      const content = file.content ?? file.code ?? file.value ?? '';

      if (filename) {
        acc[filename] = String(content);
      }

      return acc;
    }, {});
  }

  if (submittedContents && typeof submittedContents === 'object') {
    return submittedContents;
  }

  return {};
};

/**
 * Step 1: Deterministic scoring.
 * Returns:
 * - 100 for exact correct-code match
 * - 0 for unchanged buggy code or empty submission
 * - null when deterministic scoring cannot confidently grade the submission
 */
const runDeterministicScoring = (file, userCode) => {
  const buggy = (file.buggyCode || '').trim();
  const correct = (file.correctCode || '').trim();
  const user = (userCode || '').trim();

  if (!user) {
    return {
      score: 0,
      comment: '❌ No submission provided.'
    };
  }

  if (correct && user === correct) {
    return {
      score: 100,
      comment: '✅ Perfect match! The code has been completely fixed.'
    };
  }

  if (buggy && user === buggy) {
    return {
      score: 0,
      comment: '❌ No meaningful changes detected.'
    };
  }

  return {
    score: null,
    comment: '⚠️ Unable to perform deterministic evaluation. Awaiting AI review.'
  };
};

/**
 * Step 2: Gemini file review.
 */
const runGeminiFileReview = async (file, userCode) => {
  const ai = getAI();
  if (!ai) {
    throw new Error('Gemini API client not initialized');
  }

  if (!file || !file.filename || file.buggyCode === undefined || file.correctCode === undefined) {
    throw new Error('Invalid file object: filename, buggyCode, and correctCode are required');
  }

  const buggyCode = file.buggyCode || '';
  const correctCode = file.correctCode || '';
  const submittedCode = userCode || '';

  const prompt = `You are an expert code evaluator grading a user's bug fix submission.
Here is the context for file "${file.filename}":

[Original Buggy Code]
\`\`\`
${buggyCode}
\`\`\`

[Reference Correct Code]
\`\`\`
${correctCode}
\`\`\`

[User's Submitted Code]
\`\`\`
${submittedCode}
\`\`\`

Compare the User's Submitted Code against the Original Buggy Code and the Reference Correct Code.
Grade the fix. Be lenient on naming or formatting differences if the logic is correct, but strict on correctness.

Respond ONLY with a JSON object matching this schema:
{
  "score": number (0 to 100),
  "comment": "detailed explanation of what is fixed and what is missing"
}
`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      }),
      30000
    );

    const text = response.text || '';
    const result = JSON.parse(text.trim());

    return {
      score: Math.max(0, Math.min(100, Number(result.score) || 0)),
      comment: result.comment || 'AI evaluation complete.'
    };
  } catch (err) {
    const isRateLimited =
      err.message?.includes('429') ||
      err.message?.includes('quota') ||
      err.message?.includes('rate') ||
      err.message?.includes('RESOURCE_EXHAUSTED');

    if (isRateLimited) {
      console.warn(`⚠️ Rate limited on ${file.filename}.`);
    }

    console.error(`Gemini evaluation failed for ${file.filename}:`, err.message);
    throw err;
  }
};

/**
 * Step 3: Gemini integration pass for multi-file projects.
 */
const runGeminiIntegrationPass = async (files, submittedContents) => {
  const ai = getAI();

  if (!ai) {
    return {
      hasRegression: false,
      penalty: 0,
      reason: ''
    };
  }

  const filesContext = files.map((file) => {
    const code = submittedContents[file.filename] || '';
    return `File: ${file.filename}\n\`\`\`\n${code}\n\`\`\``;
  }).join('\n\n');

  const prompt = `
You are doing a cross-file integration check on a user's multi-file project submission.
Look for wrong imports, mismatching API contracts, spelling mismatches, or shared state bugs between the files.

Project Files:
${filesContext}

Identify if there are integration conflicts or regressions.
Return ONLY a JSON response in the following schema:
{
  "hasRegression": boolean,
  "penalty": number (0 to 20, where 0 is no integration issues and 20 is severe contract mismatch),
  "reason": "description of the conflicts, or empty if none"
}
`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      }),
      30000
    );

    const text = response.text || '';
    const result = JSON.parse(text.trim());

    return {
      hasRegression: Boolean(result.hasRegression),
      penalty: Math.max(0, Math.min(20, Number(result.penalty) || 0)),
      reason: result.reason || ''
    };
  } catch (err) {
    console.warn('Integration pass failed:', err.message);
    return {
      hasRegression: false,
      penalty: 0,
      reason: `Integration review unavailable due to service error: ${err.message}`
    };
  }
};

/**
 * Main Evaluation Pipeline.
 */
const evaluateSubmission = async (project, submittedContents) => {
  const ai = getAI();
  const submittedMap = normalizeSubmittedContents(submittedContents);

  if (!project || !project.files || !Array.isArray(project.files)) {
    throw new Error('Invalid project structure');
  }

  if (!submittedMap || typeof submittedMap !== 'object') {
    throw new Error('submittedContents must be an object keyed by filename or an array of submitted files');
  }

  const perFile = [];
  let aiFailed = false;

  for (const file of project.files) {
    const userCode = submittedMap[file.filename] ?? '';
    const fallbackBuggyCode = file.buggyCode || file.content || '';

    const detResult = runDeterministicScoring(
      {
        ...file,
        buggyCode: file.buggyCode || file.content || '',
        correctCode: file.correctCode || ''
      },
      userCode || fallbackBuggyCode
    );

    let fileScore = detResult.score;
    let fileComment = detResult.comment;
    let fixed = Number(fileScore) >= 70;

    if (ai && !aiFailed) {
      try {
        await delay(1500);

        const aiResult = await runGeminiFileReview(
          {
            ...file,
            buggyCode: file.buggyCode || file.content || '',
            correctCode: file.correctCode || ''
          },
          userCode || fallbackBuggyCode
        );

        if (detResult.score === null) {
          fileScore = aiResult.score;
        } else {
          fileScore = Math.round(detResult.score * 0.55 + aiResult.score * 0.45);
        }

        fileComment = aiResult.comment;
        fixed = fileScore >= 70;
      } catch (err) {
        console.warn(`Falling back to deterministic grading for ${file.filename}: ${err.message}`);
        aiFailed = true;
      }
    }

    // Safe fallback when deterministic scoring was inconclusive and AI is unavailable/failed.
    if (fileScore === null || fileScore === undefined || Number.isNaN(Number(fileScore))) {
      fileScore = 0;
      fileComment = 'Could not confidently evaluate this submission automatically. Please review the code and try again.';
      fixed = false;
    }

    fileScore = Math.max(0, Math.min(100, Number(fileScore) || 0));

    perFile.push({
      filename: file.filename,
      score: fileScore,
      fixed,
      comment: fileComment
    });
  }

  const fileCount = project.files.length || 1;
  let overallScore = Math.round(
    perFile.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / fileCount
  );

  let integrationReason = '';
  if (ai && !aiFailed && project.files.length > 1) {
    try {
      await delay(1500);
      const integrationResult = await runGeminiIntegrationPass(project.files, submittedMap);

      if (integrationResult.penalty > 0) {
        overallScore = Math.max(0, overallScore - integrationResult.penalty);
        integrationReason = `\n\n⚠️ Integration Issues (-${integrationResult.penalty} pts): ${integrationResult.reason}`;
      }
    } catch (err) {
      console.warn('Integration check failed:', err.message);
    }
  }

  const allFixed = perFile.length > 0 && perFile.every((f) => f.fixed);
  const noneFixed = perFile.length > 0 && perFile.every((f) => f.score <= 20);
  let summary = '';

  if (allFixed && overallScore >= 90) {
    summary = '🎯 **Exceptional!** All files fully fixed with clean integration!';
  } else if (allFixed) {
    summary = '✅ **Success!** All bugs resolved. Solid debugging!';
  } else if (overallScore >= 60) {
    summary = '🔧 **Partial.** Some bugs fixed but issues remain. Review feedback below.';
  } else if (noneFixed) {
    summary = '🤔 **Keep trying!** No significant changes detected. Use hints if stuck.';
  } else {
    summary = '⚡ **Good effort!** But key issues remain. Review the details below.';
  }

  if (integrationReason) {
    summary += integrationReason;
  }

  const scoringMethod = ai && !aiFailed ? 'AI Hybrid' : 'Deterministic Fallback';
  summary += `\n\n*Scoring: ${scoringMethod}*`;

  return {
    score: Math.max(0, Math.min(100, overallScore)),
    summary,
    perFile
  };
};

export { evaluateSubmission, normalizeSubmittedContents, getEvaluationRulesForFile };
