import UploadedFile from '../models/UploadedFile.js';
import Summary from '../models/Summary.js';
import UserProject from '../models/UserProject.js';
import { summarizeChunk } from './summarizer.js';
import { delay, withTimeout } from '../utils/helpers.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_CHARS_PER_CHUNK = 30000;
const MAX_PROJECT_SIZE_BYTES = 5000000; // 5MB
const MAX_CHUNKS_PER_PROJECT = 100;
const GEMINI_CHUNK_TIMEOUT_MS = parseInt(process.env.GEMINI_CHUNK_TIMEOUT_MS || '30000');
const GEMINI_RPM_DELAY_MS = parseInt(process.env.GEMINI_RPM_DELAY_MS || '2000');
const GEMINI_RETRY_ATTEMPTS = parseInt(process.env.GEMINI_RETRY_ATTEMPTS || '2');
const GEMINI_RATE_LIMIT_BACKOFF_MS = 10000; // Longer backoff for rate limits

const TEXT_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',
  '.css', '.scss', '.html',
  '.json', '.md', '.txt',
  '.env', '.example', '.sql',
  '.yml', '.yaml', '.py', '.java'
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const log = (msg) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
};

const validateEnvironment = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY environment variable not set. ' +
      'Summarization requires Gemini API access.'
    );
  }
};

const isBinaryContent = (content) => {
  return content.includes('\x00'); // Null bytes indicate binary
};

/**
 * Chunks files by collective character size (not blind count).
 * @param {Array} files - File objects with content
 * @param {number} maxChars - Max characters per chunk
 * @returns {Array<Array>} Array of file chunks
 */
const chunkFilesByLength = (files, maxChars) => {
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const file of files) {
    const content = file.content || '';

    // Skip empty files
    if (!content.trim()) continue;

    let start = 0;
    const totalParts = Math.ceil(content.length / maxChars);
    let partNumber = 1;

    while (start < content.length) {

      // Defensive check
      if (currentLength === maxChars) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLength = 0;
      }

      const remainingSpace = maxChars - currentLength;

      const charsToTake = Math.min(
        remainingSpace,
        content.length - start
      );

      currentChunk.push({
        ...file,
        content: content.substring(
          start,
          start + charsToTake
        ),

        // Metadata
        partNumber,
        totalParts
      });

      currentLength += charsToTake;
      start += charsToTake;
      partNumber++;

      if (currentLength === maxChars) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentLength = 0;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};


/**
 * Summarize a chunk with retry logic, timeout, and rate limit handling.
 * @param {Array} fileData - Files in this chunk
 * @param {number} chunkIndex - Which chunk this is
 * @param {string} projectTitle - For logging
 * @returns {string} Summary text
 */
const summarizeWithRetry = async (fileData, chunkIndex, projectTitle) => {
  for (let attempt = 1; attempt <= GEMINI_RETRY_ATTEMPTS; attempt++) {
    try {
      log(
        `🤖 Summarizing chunk ${chunkIndex} ` +
        `(attempt ${attempt}/${GEMINI_RETRY_ATTEMPTS})...`
      );

      const summary = await withTimeout(
        summarizeChunk(fileData, chunkIndex, projectTitle),
        GEMINI_CHUNK_TIMEOUT_MS
      );

      if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
        throw new Error('Empty summary received from Gemini');
      }

      return summary.trim();

    } catch (err) {
      const isRateLimited =
        err.status === 429 ||
        err.code === 'RESOURCE_EXHAUSTED' ||
        err.message.includes('quota') ||
        err.message.includes('rate');

      log(
        `⚠️ Chunk ${chunkIndex} attempt ${attempt} failed: ${err.message}` +
        (isRateLimited ? ' (RATE LIMITED)' : '')
      );

      if (attempt === GEMINI_RETRY_ATTEMPTS) {
        log(`⚠️ All retries exhausted for chunk ${chunkIndex}. Using placeholder.`);
        return `Files: ${fileData.map(f => f.fileName).join(', ')}\n\n[Summarization failed - service error. Please try again later.]`;
      }

      const backoffMs = isRateLimited
        ? GEMINI_RATE_LIMIT_BACKOFF_MS
        : 1000 * Math.pow(2, attempt - 1);
      log(`⏳ Retrying chunk ${chunkIndex} in ${backoffMs}ms...`);
      await delay(backoffMs);
    }
  }
}; 

// ─── Main Processing Function ──────────────────────────────────────────────

/**
 * Process all uploaded files for a project: chunk and summarize.
 * Runs sequentially to respect Gemini rate limits.
 * @param {string} projectId - UserProject _id
 * @param {string} userId - Owner's user ID (for authorization)
 */
const processProjectChunks = async (projectId, userId) => {
  validateEnvironment();

  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Invalid projectId: must be a non-empty string');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId: must be a non-empty string');
  }

  try {
    // ── Fetch project with ownership check ─────────────────────────────────
    const project = await UserProject.findOne({ _id: projectId, userId });

    if (!project) {
      throw new Error('Project not found or unauthorized');
    }
    // ── Prevent concurrent summarization ───────────────────────────────────
    if (project.summarizing === true) {
      log(`⚠️ Summarization already in progress for project ${projectId}`);
      return;
    }

    log(`📂 Processing project "${project.title}" (user: ${userId})...`);

    // ── Mark as summarizing ────────────────────────────────────────────────
    await UserProject.findByIdAndUpdate(projectId, { summarizing: true });

    // ── Load files ─────────────────────────────────────────────────────────
    const rawFiles = await UploadedFile.find({ projectId }).lean();

    if (!rawFiles.length) {
      log(`⚠️ No files found for project "${project.title}"`);
      await UserProject.findByIdAndUpdate(projectId, {
        summarizing: false,
        summarized: true
      });
      return;
    }

    // ── Filter text files only ─────────────────────────────────────────────
    const files = rawFiles.filter(f => {
      const lowerName = f.fileName.toLowerCase();
      return (
        TEXT_EXTENSIONS.some(ext => lowerName.endsWith(ext)) ||
        !lowerName.includes('.')
      );
    });

    if (!files.length) {
      log(
        `ℹ️ No readable text files found for project "${project.title}" ` +
        `(${rawFiles.length} file(s) total)`
      );
      await UserProject.findByIdAndUpdate(projectId, {
        summarizing: false,
        summarized: true
      });
      return;
    }

    // ── Check total project size ───────────────────────────────────────────
    const totalSize = files.reduce((sum, f) => sum + (f.content?.length || 0), 0);
    if (totalSize > MAX_PROJECT_SIZE_BYTES) {
      throw new Error(
        `Project too large (${Math.round(totalSize / 1000000)}MB). ` +
        `Maximum is ${MAX_PROJECT_SIZE_BYTES / 1000000}MB.`
      );
    }

    log(`📦 Total project size: ${Math.round(totalSize / 1000)}KB`);

    // ── Create chunks ──────────────────────────────────────────────────────
    const chunks = chunkFilesByLength(files, MAX_CHARS_PER_CHUNK);

    if (chunks.length > MAX_CHUNKS_PER_PROJECT) {
      throw new Error(
        `Project has too many chunks (${chunks.length}). ` +
        `Maximum is ${MAX_CHUNKS_PER_PROJECT}. Project is too large.`
      );
    }

    log(
      `🔧 Chunking ${files.length} file(s) into ${chunks.length} ` +
      `size-controlled chunk(s) (max ${MAX_CHARS_PER_CHUNK} chars/chunk)`
    );

    // ── Process each chunk sequentially, staging results in memory ────────
    // Old summaries are NOT deleted yet — they stay as a safety net.
    // Only after ALL chunks succeed do we swap them out atomically.
    const newSummaries = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const fileData = chunk
      .filter(f => {
        if (!f.content || f.content.trim().length === 0) return false;

        if (isBinaryContent(f.content)) {
          log(`⚠️ Skipping binary file: ${f.fileName}`);
          return false;
        }
        return true;
      })
      .map(f => ({
        fileName: f.fileName,
        partNumber: f.partNumber,
        totalParts: f.totalParts,
        content: f.content
      }));

      if (fileData.length === 0) {
        log(`⚠️ Chunk ${i} has no valid content. Skipping.`);
        continue;
      }

      // RPM delay between chunks
      if (i > 0) {
        await delay(GEMINI_RPM_DELAY_MS);
      }

      const summaryText = await summarizeWithRetry(fileData, i, project.title);

      // Stage the result — not saved to DB yet
      newSummaries.push({
        projectId,
        chunkId: i,
        fileNames: chunk.map(f => f.fileName),
        summary: summaryText,
        createdAt: new Date()
      });

      const chunkSize = fileData.reduce((sum, f) => sum + f.content.length, 0);
      log(
        `✅ Chunk ${i + 1}/${chunks.length} summarized ` +
        `(${fileData.length} file(s), ${Math.round(chunkSize / 1000)}KB)`
      );
    }

    // ── All chunks succeeded — now atomically swap old → new summaries ─────
    // Delete old ones only AFTER all new ones are ready in memory.
    // This guarantees the project never has zero summaries.
    if (newSummaries.length > 0) {
      await Summary.deleteMany({ projectId });
      await Summary.insertMany(newSummaries);
      log(`🔄 Swapped ${newSummaries.length} new summary/summaries into DB (old ones removed).`);
    } else {
      log(`⚠️ No new summaries were generated — keeping existing summaries intact.`);
    }

    // ── Mark as complete ───────────────────────────────────────────────────
    await UserProject.findByIdAndUpdate(projectId, {
      summarizing: false,
      summarized: true,
      summarizationError: null
    });

    log(`🎯 Project "${project.title}" fully summarized (${chunks.length} chunk(s))`);

  } catch (err) {
    log(`❌ Chunk processing failed for project ${projectId}: ${err.message}`);

    // Mark project as failed with error message
    await UserProject.findByIdAndUpdate(projectId, {
      summarizing: false,
      summarized: false,
      summarizationError: err.message
    }).catch(() => {}); // silent — don't throw again from cleanup

    throw err;
  }
};

export { processProjectChunks, chunkFilesByLength };