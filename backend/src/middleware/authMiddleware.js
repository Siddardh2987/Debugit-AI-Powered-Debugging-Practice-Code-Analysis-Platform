import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ─── Unified JWT Secret Helper ──────────────────────────────────────────────

// ✅ FIXED: Centralized JWT secret retrieval with validation
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return secret;
};

// ─── Extract Token Helper ──────────────────────────────────────────────────

// ✅ FIXED: Extracts token from either cookies or Authorization header
// Priority: Cookies first (httpOnly), then Authorization header (Bearer token)
const extractToken = (req) => {
  // Check httpOnly cookies first (more secure)
  let token = req.cookies?.accessToken;
  
  // Fallback to Authorization header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  return token || null;
};

// ─── Verify Token Middleware ────────────────────────────────────────────────

// ✅ FIXED: Standard JWT verification with user fetch
// Used for protected routes that require authentication
export const verifyToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    // ✅ Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login again'
      });
    }

    // ✅ Verify JWT signature and expiration
    const decoded = jwt.verify(token, getJwtSecret());
    
    // ✅ Fetch user from database (exclude sensitive fields)
    const user = await User.findById(decoded.id).select('-refreshToken -verifyOtp -resetOtp');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again'
      });
    }

    // ✅ Attach user to request object
    req.userId = decoded.id;
    req.user = user;

    next();

  } catch (error) {
    // ✅ FIXED: Specific handling for expired tokens
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Please refresh token',
        expired: true
      });
    }

    // ✅ Generic error for invalid tokens
    console.warn(`⚠️ Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// ─── Verify Token And Account Verification ──────────────────────────────────

// ✅ FIXED: Enhanced JWT verification with email verification check
// Used for protected routes that require verified email
export const verifyTokenAndAccount = async (req, res, next) => {
  try {
    const token = extractToken(req);

    // ✅ Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login again'
      });
    }

    // ✅ Verify JWT signature and expiration
    const decoded = jwt.verify(token, getJwtSecret());
    
    // ✅ Fetch user from database (exclude sensitive fields)
    const user = await User.findById(decoded.id).select('-refreshToken -verifyOtp -resetOtp');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again'
      });
    }

    // ✅ FIXED: Check if account is verified
    if (!user.isAccountVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        needsVerification: true
      });
    }

    // ✅ Attach user to request object
    req.userId = decoded.id;
    req.user = user;

    next();

  } catch (error) {
    // ✅ FIXED: Specific handling for expired tokens
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Please refresh token',
        expired: true
      });
    }

    // ✅ Generic error for invalid tokens
    console.warn(`⚠️ Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// ─── Protect (Alias for verifyToken) ────────────────────────────────────────

// ✅ NEW: Alias for consistency with common middleware naming conventions
// Same as verifyToken, used for standard protected routes
export const protect = verifyToken;

// ─── Optional Protect (Allows Unauthenticated Requests) ─────────────────────

// ✅ NEW: Graceful middleware for optional authentication
// Attaches user if token is valid, allows requests to proceed as guest if not
// Useful for endpoints that show different data based on authentication
export const optionalProtect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    // ✅ If no token provided, proceed as guest
    if (!token) {
      req.user = null;
      req.userId = null;
      return next();
    }

    // ✅ Verify JWT signature and expiration
    const decoded = jwt.verify(token, getJwtSecret());
    
    // ✅ Fetch user from database
    const user = await User.findById(decoded.id).select('-refreshToken -verifyOtp -resetOtp');
    
    // ✅ Attach user if found, otherwise null
    req.user = user || null;
    req.userId = user?._id || null;

  } catch (error) {
    // ✅ FIXED: Invalid/expired token → proceed as guest
    // Don't throw error, just set user to null
    console.warn(`⚠️ Optional auth failed (proceeding as guest): ${error.message}`);
    req.user = null;
    req.userId = null;
  }
  
  next();
};

export default {
  verifyToken,
  verifyTokenAndAccount,
  protect,
  optionalProtect
};