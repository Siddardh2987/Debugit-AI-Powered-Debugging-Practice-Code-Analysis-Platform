import express from 'express';
import { evaluate, getHint } from '../controllers/aiController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  hintLimiter,
  evaluateLimiter
} from '../middleware/rateLimiter.js';

const router = express.Router();

// ─── AI Evaluation Route ────────────────────────────────────────────────────
// POST /api/ai/evaluate
router.post('/evaluate', evaluateLimiter, verifyToken, evaluate);

// ─── AI Hint Route ──────────────────────────────────────────────────────────
// POST /api/ai/hint
router.post('/hint', hintLimiter, verifyToken, getHint);

export default router;