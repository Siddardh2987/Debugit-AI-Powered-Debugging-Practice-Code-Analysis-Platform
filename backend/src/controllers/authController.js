import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import transporter from "../config/nodemailer.js";
import { WELCOME_EMAIL_TEMPLATE, EMAIL_VERIFY_TEMPLATE, PASSWORD_RESET_TEMPLATE } from '../config/emailTemplates.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Token Helpers ────────────────────────────────────────────────────────────

const generateAccessToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: '240m' }
    );
};

const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
};

// ─── Response Builder ─────────────────────────────────────────────────────────

const buildUserResponse = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username || null,
    usernameSet: user.usernameSet || false,
    avatar: user.avatar,
    isAccountVerified: user.isAccountVerified,
    authProvider: user.authProvider,
    problems_solved: user.problems_solved || { frontend: 0, backend: 0, both: 0 },
    hasPassword: !!user.passwordHash
});

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

const setTokenCookies = (res, accessToken, refreshToken) => {
    const isProduction = process.env.NODE_ENV === 'production';

    const commonOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/'
    };

    res.cookie('accessToken', accessToken, {
        ...commonOptions,
        maxAge: 4 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
        ...commonOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

const clearAuthCookies = (res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const commonOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/'
    };
    res.clearCookie('accessToken', commonOptions);
    res.clearCookie('refreshToken', commonOptions);
};

// ─── SIGNUP ───────────────────────────────────────────────────────────────────

export const signup = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Name, email and password are required'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters'
        });
    }

    if (!/[A-Z]/.test(password)) {
        return res.status(400).json({
            success: false,
            message: 'Password must contain at least one uppercase letter'
        });
    }

    if (!/[0-9]/.test(password)) {
        return res.status(400).json({
            success: false,
            message: 'Password must contain at least one number'
        });
    }

    try {
        const existing = await User.findOne({ email });
if (existing) {
    // FIX: Check if existing account is Google account
    if (existing.googleId && !existing.passwordHash) {
        return res.status(409).json({
            success: false,
            message: 'This email is registered with Google Sign-In. Please continue with Google.'
        });
    }
    return res.status(409).json({
        success: false,
        message: 'Email already registered. Please login instead.'
    });
}

        const passwordHash = await bcrypt.hash(password, 10);

        const verifyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const verifyOtpExpireAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        const user = await User.create({
            name,
            email,
            passwordHash,
            avatar: name.charAt(0).toUpperCase(),
            isAccountVerified: false,
            verifyOtp,
            verifyOtpExpireAt,
            authProvider: 'local'
        });

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        setTokenCookies(res, accessToken, refreshToken);

        // Send verification OTP email (non-blocking)
        transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: '🎭 Verify Your Email',
            html: EMAIL_VERIFY_TEMPLATE
                .replaceAll('{{name}}', name)
                .replaceAll('{{email}}', email)
                .replaceAll('{{otp}}', verifyOtp)
        }).catch(err => console.error('Verification email failed:', err.message));

        return res.status(201).json({
            success: true,
            message: 'Account created successfully. Please verify your email with the OTP sent.',
            user: buildUserResponse(user),
            accessToken
        });

    } catch (error) {
        console.error('Signup error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.passwordHash) {
            return res.status(400).json({
                success: false,
                message: 'This account uses Google Sign-In. Please continue with Google.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        setTokenCookies(res, accessToken, refreshToken);

        return res.json({
            success: true,
            message: 'Login successful',
            user: buildUserResponse(user),
            accessToken
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

// ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────────

export const googleLogin = async (req, res) => {
    try {
        const { credential, isSignup } = req.body;
        const clientId = process.env.GOOGLE_CLIENT_ID;

        if (!clientId) {
            return res.status(500).json({
                success: false,
                message: 'Google Sign-In is not configured'
            });
        }

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'Google credential is required'
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: clientId
        });

        const payload = ticket.getPayload();
        const email = payload?.email?.toLowerCase();
        const name = payload?.name || email?.split('@')[0] || 'User';
        const googleId = payload?.sub;

        if (!email || !googleId || !payload.email_verified) {
            return res.status(401).json({
                success: false,
                message: 'Google account could not be verified'
            });
        }

        let user = await User.findOne({ email });

        // LOGIN attempt — account must exist
        if (!user && !isSignup) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this Google account. Please sign up first.'
            });
        }

        // SIGNUP attempt — account must NOT exist
        if (user && isSignup) {
            return res.status(409).json({
                success: false,
                message: 'An account already exists with this Google account. Please login instead.'
            });
        }

        // SIGNUP — create new account
        if (!user && isSignup) {
            user = await User.create({
                name,
                email,
                googleId,
                avatar: name.charAt(0).toUpperCase(),
                authProvider: 'google',
                isAccountVerified: true
            });
        } else {
            // LOGIN — update existing user
            user.googleId = user.googleId || googleId;
            user.authProvider = user.passwordHash ? 'local_google' : 'google';
            user.isAccountVerified = true;
            if (!user.name) user.name = name;
            await user.save();
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save();

        setTokenCookies(res, accessToken, refreshToken);

        return res.json({
            success: true,
            message: isSignup ? 'Account created successfully' : 'Google login successful',
            user: buildUserResponse(user),
            accessToken
        });

    } catch (error) {
        console.error('Google login error:', error);
        return res.status(401).json({
            success: false,
            message: 'Google login failed'
        });
    }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

export const logout = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        await User.findByIdAndUpdate(req.userId, { refreshToken: null });
        clearAuthCookies(res);

        return res.json({ success: true, message: 'Logged out successfully' });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

// ─── REFRESH ACCESS TOKEN ─────────────────────────────────────────────────────

export const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        const newAccessToken = generateAccessToken(user._id);
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: 4 * 60 * 60 * 1000
        });

        return res.json({
            success: true,
            message: 'Access token refreshed',
            accessToken: newAccessToken
        });

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Refresh token expired. Please login again'
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

// ─── SEND RESET OTP ───────────────────────────────────────────────────────────

export const sendResetOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({
                success: true,
                message: "If this email is registered, you will receive a reset link shortly."
            });
        }

        const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();

        user.resetOtp = resetOtp;
        user.resetOtpExpireAt = Date.now() + 10 * 60 * 1000;
        await user.save();

        await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: '🔑 Reset Your DebugIt Password',
            html: PASSWORD_RESET_TEMPLATE
                .replaceAll('{{name}}', user.name)
                .replaceAll('{{email}}', user.email)
                .replaceAll('{{otp}}', resetOtp)
        });

        return res.json({ success: true, message: 'Password reset email sent' });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, OTP, and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const user = await User.findOne({ email });

        if (!user || user.resetOtp !== otp || !user.resetOtpExpireAt || user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP code'
            });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        user.resetOtp = '';
        user.resetOtpExpireAt = null;
        await user.save();

        return res.json({ success: true, message: 'Password reset successful' });

    } catch (e) {
        console.error('Reset password error:', e);
        return res.status(500).json({
            success: false,
            message: e.message || 'Something went wrong. Please try again later.'
        });
    }
};

// ─── IS AUTHENTICATED ─────────────────────────────────────────────────────────

export const isAuthenticated = async (req, res) => {
    try {
        console.log("isAuthenticated debug req.user:", {
            id: req.user?._id,
            email: req.user?.email,
            passwordHash: req.user?.passwordHash ? req.user.passwordHash.substring(0, 10) + '...' : 'undefined/null/empty',
            hasPassword: !!req.user?.passwordHash
        });
        return res.json({
            success: true,
            user: buildUserResponse(req.user)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

// ─── GET USER PROFILE ─────────────────────────────────────────────────────────
// 🔴 This thing is literally there in userController.js also delete the buildUserResponse() function above.
// (Fixed: Routed authRoutes.js profiles requests to userController.js directly, but kept this endpoint definition intact here to prevent breaking import chains or tests)
export const getUserProfile = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const user = await User.findById(req.userId)
            .select('-refreshToken -resetOtp');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.json({ success: true, user: buildUserResponse(user) });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

// ─── VERIFY ACCOUNT OTP ───────────────────────────────────────────────────────

export const verifyAccountOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isAccountVerified) {
            return res.status(400).json({
                success: false,
                message: 'Account is already verified'
            });
        }

        if (user.verifyOtp !== otp || !user.verifyOtpExpireAt || user.verifyOtpExpireAt < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = null;
        await user.save();

        // Send welcome email now that account is verified
        transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: '🎉 Welcome to DebugIt!',
            html: WELCOME_EMAIL_TEMPLATE
                .replaceAll('{{name}}', user.name)
                .replaceAll('{{email}}', email)
        }).catch(err => console.error('Welcome email failed:', err.message));

        return res.json({
            success: true,
            message: 'Account verified successfully'
        });

    } catch (e) {
        console.error('Verify OTP error:', e.message);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};