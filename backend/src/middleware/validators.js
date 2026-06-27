import { body, validationResult } from 'express-validator';


export const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail({ gmail_remove_subaddress: false })
        .withMessage('Invalid email format'),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
    
    // ✅ Error handler middleware
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];


export const validateSignup = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2-50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('email')
        .isEmail()
        .normalizeEmail({ gmail_remove_subaddress: false })
        .withMessage('Invalid email'),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number'),
    
    // ✅ Error handler middleware
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];


export const validateEmailChange = [
    body('newEmail')
        .isEmail()
        .normalizeEmail({ gmail_remove_subaddress: false })
        .withMessage('Invalid email format'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];

export const validatePasswordChange = [
    body('currentPassword')
        .isLength({ min: 6 })
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];

export const validateOtpSubmission = [
    body('email')
        .isEmail()
        .normalizeEmail({ gmail_remove_subaddress: false })
        .withMessage('Invalid email format'),
    
    body('otp')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP must be a 6-digit number'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];

export default {
    validateLogin,
    validateSignup,
    validateEmailChange,
    validatePasswordChange,
    validateOtpSubmission
};