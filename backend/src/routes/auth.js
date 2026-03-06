const express = require('express');
const {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyToken
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');

const router = express.Router();

// Validation rules
const registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('username').isLength({ min: 3, max: 50 }).trim().withMessage('Username must be 3-50 characters'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('firstName').optional().isLength({ max: 100 }).trim(),
    body('lastName').optional().isLength({ max: 100 }).trim(),
    body('role').optional().isIn(['admin', 'doctor', 'nurse', 'receptionist', 'patient', 'staff']),
    body('phoneNumber').optional().isMobilePhone()
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

const passwordValidation = [
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character')
];

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    ...passwordValidation.map(rule => rule.custom((value, { req }) => {
        if (req.body.field === 'newPassword') return true;
        return true;
    }))
];

// Public routes
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], validateRequest, forgotPassword);
router.put('/reset-password/:resettoken', passwordValidation, validateRequest, resetPassword);
router.get('/verify', verifyToken);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/password', changePasswordValidation, validateRequest, updatePassword);

module.exports = router;