import express from 'express';
import { getStats, getActivity, getSkills } from '../controllers/statsController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getStats);
router.get('/activity', verifyToken, getActivity);
router.get('/skills', verifyToken, getSkills);

export default router;
