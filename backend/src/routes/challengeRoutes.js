import express from 'express';
import {
  getChallenges,
  getChallengeById,
  getChallengeHint,
  submitChallenge,
  getChallengeChat,
  deleteChallengeChat
} from '../controllers/challengeController.js';

import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import {
  hintLimiter,
  evaluateLimiter,
  perUserHintLimiter
} from '../middleware/rateLimiter.js';

const router = express.Router();

// ─── Public Challenge Routes ────────────────────────────────────────────────
router.get('/', getChallenges);

router.get('/:id', getChallengeById);

router.get('/:id/chat', protect, getChallengeChat);

router.delete('/:id/chat', protect, deleteChallengeChat);

// ─── Hint Route ─────────────────────────────────────────────────────
router.post(
  '/:id/hint',
  hintLimiter,
  optionalProtect,
  perUserHintLimiter,
  getChallengeHint
);

// ─── Submit Route ───────────────────────────────────────────────────────────
router.post(
  '/:id/submit',
  evaluateLimiter,
  optionalProtect,
  submitChallenge
);

export default router;