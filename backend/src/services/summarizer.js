import { generateContent } from './gemini.js';

/**
 * Generate a summary for a single chunk of files.
 * @param {Array} files - Array of { fileName, content }
 * @param {number} chunkIndex - Index of this chunk
 * @param {string} projectTitle - Title of the project
 * @returns {string} summary text
 */
const summarizeChunk = async (files, chunkIndex, projectTitle) => {
  
  if (!Array.isArray(files) || files.length === 0) {
    return 'No files provided in this chunk.';
  }

  const filesContext = files.map(f =>
  `=== ${f.fileName} ===
Part ${f.partNumber || 1} of ${f.totalParts || 1}

${f.content}
`
).join('\n\n');

  const prompt = `
You are a code summarizer for a debugging assistant platform called DebugIt.

The user has uploaded their project titled: "${projectTitle}".

This is chunk ${chunkIndex + 1} of the project.

Important:
- Some files may be split across multiple parts because they exceed the maximum chunk size.
- If a file shows "Part X of Y" where Y > 1, then you are only seeing a fragment of that file.
- Do NOT assume missing code exists unless strongly implied.
- Summarize only what is visible.
- If a file is partial, explicitly mention that the summary is based on a partial view.
- Focus on information useful for future debugging, maintenance, feature development, and code understanding.

For each file provide:

1. Purpose
2. Key Functions / Classes
3. Important Business Logic
4. Dependencies / Imports
5. API Calls / Database Usage
6. Potential Issues, Risks, or Noteworthy Observations

Also identify:
- Relationships between files visible in this chunk.
- Shared utilities, services, hooks, models, or APIs.
- Architectural patterns if visible.

Files:

${filesContext}

Output a structured technical summary.

Do NOT generate code.
Do NOT fix bugs.
Do NOT suggest refactors unless directly relevant to understanding the code.

Maximum 250-400 words.Prioritize dense technical information over prose.DO NOT write corrected code or fix bugs. Only summarize.
`;

  try {
    console.log(`📝 Generating summary for chunk ${chunkIndex + 1} (${files.length} files)`);
    const text = await generateContent(prompt);
    
    if (!text || text.trim().length < 10) {
      throw new Error('Empty summary returned from Gemini');
    }

    console.log(`✅ Summary generated for chunk ${chunkIndex + 1}: ${text.length} characters`);
    return text.trim();

  } catch (err) {
    console.error(`❌ Summarization failed for chunk ${chunkIndex + 1}:`, err.message);
    
    return `
Chunk Summary:

This chunk contains ${files.length} files:
${files.map(f => `• ${f.fileName}`).join('\n')}

Automatic summarization is temporarily unavailable. The full raw content of all files is available for debugging.
`.trim();
  }
};

export { summarizeChunk };