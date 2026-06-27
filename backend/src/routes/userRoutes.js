import express from 'express';
import { getUserProfile, updateUserProfile, changePassword } from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me/profile', verifyToken, getUserProfile);

router.put('/me/profile', verifyToken, updateUserProfile);

router.put('/me/password', verifyToken, changePassword);

export default router;
