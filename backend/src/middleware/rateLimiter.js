import rateLimit from 'express-rate-limit';
import { sendTooManyLoginAttemptsEmail } from '../utils/loginAlert.js';

// ─── Login Rate Limiter ──────────────────────────────────────────────────────

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,      // 15 minutes
    max: 100000,                        // Raised to 100,000
    standardHeaders: true,          // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,           // Disable old X-RateLimit-* headers
    handler: async (req, res) => {
        if (req.body?.email) {
            sendTooManyLoginAttemptsEmail({
                email: req.body.email,
                name: 'User',
                ip: req.ip 
            }).catch(err => {
                console.error('❌ Failed to send security email alert:', err.message);
            });
        }

        res.status(429).json({
            success: false,
            message: 'Too many login attempts. Please try later.'
        });
    }
});

// ─── OTP Rate Limiter ────────────────────────────────────────────────────────

export const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,      // 1 hour
    max: 100000,                         // Raised to 100,000
    message: {
        success: false,
        message: 'Too many OTP requests. Please try again after 1 hour.'
    }
});

// ─── Password Reset Rate Limiter ────────────────────────────────────────────

export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,      // 1 hour
    max: 100000,                         // Raised to 100,000
    message: {
        success: false,
        message: 'Too many password reset attempts. Please try again later.'
    }
});

// ─── Hint Endpoint Rate Limiter ─────────────────────────────────────────────

export const hintLimiter = rateLimit({
  windowMs: 60 * 1000,             // 1 minute
  max: 100000,                         // Raised to 100,000
  message: {
    success: false,
    message: 'Too many hint requests. Please slow down and try again in a minute.'
  },
  standardHeaders: true,           // Return rate limit info in RateLimit-* headers
  legacyHeaders: false             // Disable old X-RateLimit-* headers
});

// ─── Evaluate Endpoint Rate Limiter ─────────────────────────────────────────

export const evaluateLimiter = rateLimit({
  windowMs: 60 * 1000,             // 1 minute
  max: 100000,                          // Raised to 100,000
  message: {
    success: false,
    message: 'Too many submission attempts. Please slow down and try again in a minute.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Per-User Hint Limiter (Requires Auth) ──────────────────────────────────

export const perUserHintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,        // 1 hour
  max: 100000,                        // Raised to 100,000
  message: {
    success: false,
    message: 'You have reached your hourly hint limit. Come back later!'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Use authenticated user ID if available, fallback to IP
    return req.user?._id?.toString() || req.ip;
  },
  validate: { keyGeneratorIpFallback: false }
});

// ─── Project Upload Rate Limiter ────────────────────────────────────────────

export const projectUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15 minutes
  max: 100000,                         // Raised to 100,000
  message: {
    success: false,
    message: 'Too many project uploads. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Project Chat Rate Limiter ──────────────────────────────────────────────

export const projectChatLimiter = rateLimit({
  windowMs: 60 * 1000,             // 1 minute
  max: 100000,                         // Raised to 100,000
  message: {
    success: false,
    message: 'Too many project chat requests. Please slow down and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export default {
  loginLimiter,
  otpLimiter,
  passwordResetLimiter,
  hintLimiter,
  evaluateLimiter,
  perUserHintLimiter,
  projectUploadLimiter,
  projectChatLimiter
};