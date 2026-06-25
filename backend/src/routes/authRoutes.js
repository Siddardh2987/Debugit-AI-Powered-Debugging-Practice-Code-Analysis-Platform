import express from 'express';
import {
    signup,
    login,
    googleLogin,
    logout,
    refreshAccessToken,
    sendResetOtp,
    resetPassword,
    verifyAccountOtp,
    isAuthenticated
} from '../controllers/authController.js';
import { getUserProfile } from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateLogin, validateSignup } from '../middleware/validators.js';
import { loginLimiter, otpLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ─── Public Routes (No Authentication Required) ──────────────────────────────

// 🟡 U forgot to add ratelimiter here.
// (Fixed: Added loginLimiter rate limiter to signup, login, google, and refresh routes)
// ✅ CRITICAL FIX: All public auth endpoints now have rate limiting

// ✅ Signup endpoint with validation and rate limiting
router.post('/signup', 
    loginLimiter,           // Rate limit: 10 attempts per 15 minutes
    validateSignup,         // ✅ NEW: Input validation
    signup
);

// ✅ Login endpoint with validation and rate limiting
router.post('/login', 
    loginLimiter,           // Rate limit: 10 attempts per 15 minutes
    validateLogin,          // ✅ NEW: Input validation
    login
);

// ✅ Google OAuth login with rate limiting
router.post('/google', 
    loginLimiter,           // Rate limit: 10 attempts per 15 minutes
    googleLogin
);

// ✅ Send reset OTP with rate limiting
router.post('/send-reset-otp', 
    otpLimiter,             // Rate limit: 5 attempts per hour
    sendResetOtp
);

// ✅ Verify signup OTP with rate limiting
router.post('/verify-otp',
    otpLimiter,             // Rate limit: 5 attempts per hour
    verifyAccountOtp
);

// ✅ Reset password with rate limiting
router.post('/reset-password', 
    passwordResetLimiter,   // Rate limit: 5 attempts per hour
    resetPassword
);

// ✅ Refresh access token with rate limiting
router.post('/refresh-token', 
    loginLimiter,           // Rate limit: 10 attempts per 15 minutes
    refreshAccessToken
);

// ─── Protected Routes (Authentication Required) ──────────────────────────────

// ✅ Logout endpoint (requires authentication)
router.post('/logout', 
    verifyToken,            // Middleware: Verify JWT token
    logout
);

// ✅ Check authentication status (requires token)
router.get('/me', 
    verifyToken,            // Middleware: Verify JWT token
    isAuthenticated
);

// ✅ Alternative endpoint to check if user is authenticated
router.get('/is-authenticated', 
    verifyToken,            // Middleware: Verify JWT token
    isAuthenticated
);

// ✅ Get user profile (requires authentication)
router.get('/profile', 
    verifyToken,            // Middleware: Verify JWT token
    getUserProfile
);

export default router;