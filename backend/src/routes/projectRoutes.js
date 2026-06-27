import express from 'express';
import { upload, uploadProject, chatWithProject, getMyProjects, getProjectById, getProjectStatus, deleteProject } 
from '../controllers/uploadController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { projectUploadLimiter, projectChatLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Upload files (multipart/form-data)
router.post('/upload', verifyToken, projectUploadLimiter, upload.array('files', 10), uploadProject);

// Chat with an uploaded project
router.post('/chat', verifyToken, projectChatLimiter, chatWithProject);

// List user's uploaded projects
router.get('/', verifyToken, getMyProjects);

// Get single uploaded project
router.get('/:projectId', verifyToken, getProjectById);

// Delete uploaded project
router.delete('/:projectId', verifyToken, deleteProject);

// Get project analysis status
router.get('/:projectId/status', verifyToken, getProjectStatus);

export default router;
