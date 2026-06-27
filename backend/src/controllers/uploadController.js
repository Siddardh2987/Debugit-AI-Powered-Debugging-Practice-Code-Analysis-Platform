import multer from 'multer';
import UserProject from '../models/UserProject.js';
import UploadedFile from '../models/UploadedFile.js';
import Summary from '../models/Summary.js';
import { processProjectChunks } from '../services/chunkProcessor.js';
import { generateProjectHint } from '../services/hintGenerator.js';
import { incrementStat } from './statsController.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['.js', '.jsx', '.css', '.html', '.json', '.md', '.env.example', '.gitignore', '.dockerignore'];

const MAX_PROJECTS_PER_USER = 50;  
const MAX_TOTAL_SIZE = 5000000;    // 5MB limit per upload
const MAX_FILES = 10;              // Max files per upload batch

// ─── Helpers ────────────────────────────────────────────────────────────

const log = (msg) => {
  console.log(`[${new Date().toISOString()}] ${msg}`);
};

// ─── Multer Config ──────────────────────────────────────────────────────────

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = '.' + file.originalname.split('.').pop().toLowerCase();
  const isIgnoredFile = file.originalname.startsWith('.');
  if (ALLOWED_EXTENSIONS.includes(ext) || isIgnoredFile) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.originalname}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB per file
    files: 10                   // Max 10 files per upload
  }
});

// ─── Upload Project Files ─────────────────────────────────────────────────

export const uploadProject = async (req, res) => {
  try {
    const userId = req.user._id;
    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    let filesToSave = [];

    if (req.files && req.files.length > 0) {
      filesToSave = req.files.map(f => ({
        fileName: f.originalname,
        originalName: f.originalname,
        content: f.buffer.toString('utf-8'),
        mimeType: f.mimetype,
        size: f.size
      }));
    }

    if (req.body.pastedFiles) {
      let pasted;
      try {
        pasted = typeof req.body.pastedFiles === 'string'
          ? JSON.parse(req.body.pastedFiles)
          : req.body.pastedFiles;
      } catch {
        pasted = [];
      }
      pasted.forEach(pf => {
        if (pf.fileName && pf.content) {
          filesToSave.push({
            fileName: pf.fileName,
            originalName: pf.fileName,
            content: pf.content,
            mimeType: 'text/plain',
            size: pf.content.length
          });
        }
      });
    }

    if (!filesToSave.length) {
      return res.status(400).json({
        success: false,
        message: 'No files provided. Please upload files or paste code.'
      });
    }

    if (filesToSave.length > MAX_FILES) {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum is ${MAX_FILES}.`
      });
    }

    const totalSize = filesToSave.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Total size too large (${Math.round(totalSize / 1000000)}MB). Max is ${MAX_TOTAL_SIZE / 1000000}MB.`
      });
    }


    const userProjectCount = await UserProject.countDocuments({ userId });
    if (userProjectCount >= MAX_PROJECTS_PER_USER) {
      return res.status(403).json({
        success: false,
        message: `Project limit reached (${MAX_PROJECTS_PER_USER}). Delete old projects first.`
      });
    }

    const project = await UserProject.create({
      userId,
      title,
      description,
      fileCount: filesToSave.length,
      summarizing: false,
      summarized: false
    });

    const fileDocs = filesToSave.map(f => ({
      projectId: project._id,
      fileName: f.fileName,
      originalName: f.originalName,
      content: f.content,
      mimeType: f.mimeType,
      size: f.size
    }));
    await UploadedFile.insertMany(fileDocs);

    log(`📂 Project created: "${title}" (${filesToSave.length} files) by user ${userId}`);

    processProjectChunks(project._id.toString(), userId.toString()).catch(err => {
      console.error('Background summarization failed:', err.message);
    });

    incrementStat(userId.toString(), 'projectsUploaded').catch(err =>
      console.error('projectsUploaded update failed:', err.message)
    );

    return res.status(201).json({
      success: true,
      message: 'Project uploaded successfully. AI summarization started.',
      project: {
        id: project._id,
        title: project.title,
        description: project.description,
        fileCount: filesToSave.length,
        summarized: false,
        summarizing: true,
        createdAt: project.createdAt
      }
    });

  } catch (err) {
    log(`❌ Upload error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload project. Please try again.'
    });
  }
};

// ─── Chat With Uploaded Project ──────────────────────────────────────────

export const chatWithProject = async (req, res) => {
  const { projectId, userMessage, chatHistory } = req.body;

  if (!projectId || !userMessage) {
    return res.status(400).json({
      success: false,
      message: 'projectId and userMessage are required.'
    });
  }

  try {
    const project = await UserProject.findOne({
      _id: projectId,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (!project.summarized) {
      return res.status(400).json({
        success: false,
        message: 'Project is still being summarized. Please wait.'
      });
    }

    const hint = await generateProjectHint(
      projectId,
      req.user._id.toString(),
      userMessage,
      chatHistory || []
    );

    project.chatHistory.push(
      { role: 'user', content: userMessage, timestamp: new Date() },
      { role: 'assistant', content: hint, timestamp: new Date() }
    );
    if (project.chatHistory.length > 20) {
      project.chatHistory = project.chatHistory.slice(-20);
    }
    await project.save();

    log(`💬 Chat for project ${projectId} by user ${req.user._id}`);

    incrementStat(req.user._id, 'questionsAsked').catch(err =>
      console.error('questionsAsked update failed:', err.message)
    );

    return res.json({ success: true, hint, projectId });

  } catch (err) {
    log(`❌ Chat error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate response. Please try again.'
    });
  }
};

// ─── List User's Uploaded Projects ──────────────────────────────────────

export const getMyProjects = async (req, res) => {
  try {
    const projects = await UserProject.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: projects.length,
      projects: projects.map(p => ({
        id: p._id,
        title: p.title,
        description: p.description,
        fileCount: p.fileCount, // Number of files in project
        summarized: p.summarized,
        summarizing: p.summarizing,
        createdAt: p.createdAt
      }))
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
};

// ─── Get Single Uploaded Project ──────────────────────────────────────────

export const getProjectById = async (req, res) => {
  try {
    const project = await UserProject.findOne({
      _id: req.params.projectId,
      userId: req.user._id
    }).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const files = await UploadedFile.find({ projectId: project._id })
      .select('fileName mimeType size content createdAt')
      .lean();

    const summaries = await Summary.find({ projectId: project._id })
      .sort({ chunkId: 1 })
      .lean();

    return res.json({
      success: true,
      id: project._id,
      title: project.title,
      description: project.description,
      fileCount: project.fileCount,
      summarized: project.summarized,
      summarizing: project.summarizing,
      createdAt: project.createdAt,
      chatHistory: (project.chatHistory || []).slice(-20),
      files: files.map(f => ({
        fileName: f.fileName,
        size: f.size,
        content: f.content,
        mimeType: f.mimeType,
        createdAt: f.createdAt
      })),
      summaries: summaries.map(s => ({ chunkId: s.chunkId, fileNames: s.fileNames }))
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch project'
    });
  }
};

// ─── Get Project Status ──────────────────────────────────────────────────

export const getProjectStatus = async (req, res) => {
  try {
    const project = await UserProject.findOne({
      _id: req.params.projectId,
      userId: req.user._id
    }).select('summarizing summarized fileCount summarizationError');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    res.json({
      success: true,
      status: {
        summarizing: project.summarizing,
        summarized: project.summarized,
        fileCount: project.fileCount,
        state: project.summarizationError
          ? 'failed'
          : project.summarized
            ? 'completed'
            : project.summarizing
              ? 'processing'
              : 'pending',
        error: project.summarizationError || null
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch project status'
    });
  }
};

// ─── Delete Uploaded Project ────────────────────────────────────────────

export const deleteProject = async (req, res) => {
  try {
    const project = await UserProject.findOne({
      _id: req.params.projectId,
      userId: req.user._id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    await UploadedFile.deleteMany({ projectId: project._id });
    await Summary.deleteMany({ projectId: project._id });
    await UserProject.deleteOne({ _id: project._id });

    log(`🗑️  Project deleted: "${project.title}" (${project._id})`);

    return res.json({
      success: true,
      message: 'Project deleted successfully.'
    });

  } catch (err) {
    log(`❌ Delete error: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete project'
    });
  }
};

export default { uploadProject, chatWithProject, getMyProjects, getProjectById, getProjectStatus, deleteProject };