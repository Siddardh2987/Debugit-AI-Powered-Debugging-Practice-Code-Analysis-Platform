import express from 'express';
import {
  getChallenges,
  getChallengeById,
  getChallengeHint,
  submitChallenge,
  getChallengeChat,
  deleteChallengeChat,
  getChallengeTerminal,
  updateChallengeTerminal,
  deleteChallengeTerminal
} from '../controllers/challengeController.js';

import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import {
  hintLimiter,
  evaluateLimiter,
  perUserHintLimiter
} from '../middleware/rateLimiter.js';

const router = express.Router();

// ─── Public Challenge Routes ────────────────────────────────────────────────
// GET /api/challenges
router.get('/', getChallenges);

// GET /api/challenges/:id
router.get('/:id', getChallengeById);

// GET /api/challenges/:id/chat
router.get('/:id/chat', protect, getChallengeChat);

// DELETE /api/challenges/:id/chat
router.delete('/:id/chat', protect, deleteChallengeChat);

// GET /api/challenges/:id/terminal
router.get('/:id/terminal', protect, getChallengeTerminal);

// PUT /api/challenges/:id/terminal
router.put('/:id/terminal', protect, updateChallengeTerminal);

// DELETE /api/challenges/:id/terminal
router.delete('/:id/terminal', protect, deleteChallengeTerminal);

// ─── Hint Route ─────────────────────────────────────────────────────────────
// POST /api/challenges/:id/hint
// Optional auth: guest users can get hints, logged-in users get stats tracked
router.post(
  '/:id/hint',
  hintLimiter,
  optionalProtect,
  perUserHintLimiter,
  getChallengeHint
);

// ─── Submit Route ─────────────────────────────────────────────────────
router.post(
  '/:id/submit',
  evaluateLimiter,
  optionalProtect,
  submitChallenge
);

export default router;