import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Challenge from './models/Challenge.js';
import authRouter from './routes/authRoutes.js';
import challengeRouter from './routes/challengeRoutes.js';
import userRouter from './routes/userRoutes.js';

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS Configuration ─────────────────────────────────────────────────────

const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Global Rate Limiter ────────────────────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 30, // 30 requests per day
  message: {
    success: false,
    message: 'Too many requests from this IP today, please try again tomorrow.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Database Connection + Seeding ──────────────────────────────────────────

const seedDB = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Skipping challenge seed: MongoDB is not connected.');
      return;
    }
    const count = await Challenge.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding challenges...');
      await Challenge.insertMany(
        seedChallenges.map(c => {
          const { id, ...rest } = c;
          return rest;
        })
      );
      console.log(`✅ Seeded ${seedChallenges.length} challenges.`);
    } else {
      console.log(`💡 ${count} challenges already in database.`);
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  }
};

connectDB()
  .then(() => {
    seedDB();

    // Start Server
    app.listen(PORT, () => {
      console.log(`🚀 DebugIt API running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 CORS Origin: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}`);
      console.log(`\n📚 Available Routes:`);
      console.log(`   → Challenges: /api/challenges`);
      console.log(`   → Auth:       /api/auth`);
      console.log(`   → Users:      /api/users`);
      console.log(`   → Health:     /health`);
    });
  })
  .catch((err) => {
    console.error('❌ Database initialization failed. Exiting process...');
    process.exit(1);
  });

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    ok: dbConnected,
    service: 'debugit-api',
    version: '2.0.0',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────

// Pipeline 4: Authentication
app.use('/api/auth', authRouter);

// Pipeline 2: Debugging Challenges (curated)
app.use('/api/challenges', challengeRouter);

// User profile routes
app.use('/api/users', userRouter);

// ─── 404 Handler (Not Found) ────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: {
      auth: '/api/auth',
      challenges: '/api/challenges',
      users: '/api/users',
      health: '/health'
    }
  });
});

// ─── Global Error Handler ───────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 2MB per file.'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum 10 files per upload.'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.message
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
