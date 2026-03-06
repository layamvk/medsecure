const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, AuditLog, SecurityEvent } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Helper function to get client IP
const getClientIP = (req) => {
    let ip = req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // Handle localhost cases for development
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
        ip = '127.0.0.1';
    }
    
    return ip || '127.0.0.1'; // Default to localhost if no IP found
};

// Helper function to create and send JWT token
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    // Create token
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Cookie options
    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    res.status(statusCode)
       .cookie('refreshToken', refreshToken, cookieOptions)
       .json({
           success: true,
           message,
           token,
           refreshToken: 'cookie', // Don't send refresh token in response body
           user: {
               id: user._id,
               email: user.email,
               username: user.username,
               firstName: user.firstName,
               lastName: user.lastName,
               role: user.role,
               isVerified: user.isVerified,
               isMfaEnabled: user.isMfaEnabled
           }
       });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (or Admin only - adjust based on requirements)
exports.register = asyncHandler(async (req, res, next) => {
    // Check if database is connected
    if (global.useMockDB) {
        return res.status(503).json({
            success: false,
            error: 'Database not connected',
            message: 'MongoDB Atlas connection failed. Please whitelist your IP address in MongoDB Atlas Network Access settings.',
            action: 'Go to https://cloud.mongodb.com → Network Access → Add IP Address → Allow Access from Anywhere'
        });
    }

    const { email, username, password, firstName, lastName, role, phoneNumber } = req.body;
    const createdBy = req.user ? req.user.id : null;

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existingUser) {
        return res.status(400).json({
            success: false,
            error: 'User with this email or username already exists'
        });
    }

    // Create user
    const user = await User.create({
        email,
        username,
        password,
        firstName,
        lastName,
        role: role || 'patient',
        phoneNumber
    });

    // Log the registration
    await AuditLog.createLog({
        user: user._id,
        action: 'create',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            email: user.email,
            username: user.username,
            role: user.role,
            createdBy
        }
    });

    logger.info(`New user registered: ${user.email}`);

    sendTokenResponse(user, 201, res, 'User registered successfully');
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// Demo users for mock/offline mode
const MOCK_USERS = {
    'admin@medsecure.com':    { id: 'mock-admin-001',   password: 'Admin123!',   role: 'admin',        firstName: 'Admin', lastName: 'User',     username: 'admin' },
    'doctor@medsecure.com':   { id: 'mock-doctor-001',  password: 'Doctor123!',  role: 'doctor',       firstName: 'Dr. Sarah', lastName: 'Chen', username: 'drchen' },
    'nurse@medsecure.com':    { id: 'mock-nurse-001',   password: 'Nurse123!',   role: 'nurse',        firstName: 'Emily', lastName: 'Johnson',  username: 'ejohnson' },
    'patient@medsecure.com':  { id: 'mock-patient-001', password: 'Patient123!', role: 'patient',      firstName: 'John',  lastName: 'Doe',      username: 'jdoe' },
    'reception@medsecure.com':{ id: 'mock-recep-001',   password: 'Reception1!', role: 'receptionist', firstName: 'Maria', lastName: 'Garcia',   username: 'mgarcia' },
};

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Always check demo users first (works regardless of DB state)
    const mockUser = MOCK_USERS[email];
    if (mockUser && mockUser.password === password) {
        const token = jwt.sign(
            { id: mockUser.id, email, role: mockUser.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );
        const refreshTokenVal = jwt.sign(
            { id: mockUser.id },
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
        );
        return res.status(200).cookie('refreshToken', refreshTokenVal, {
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: false,
                sameSite: 'lax'
            }).json({
                success: true,
                message: 'Login successful',
                token,
                refreshToken: 'cookie',
                user: {
                    id: mockUser.id,
                    email,
                    username: mockUser.username,
                    firstName: mockUser.firstName,
                    lastName: mockUser.lastName,
                    role: mockUser.role,
                    isVerified: true,
                    isMfaEnabled: false
                }
            });
    }

    // Database not connected — only demo users work
    if (global.useMockDB) {
        return res.status(401).json({ success: false, error: 'Invalid credentials (demo mode — use demo accounts)' });
    }
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];

    // Validate email & password
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Please provide an email and password'
        });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        // Log failed login attempt
        await SecurityEvent.create({
            eventType: 'failed_login',
            severity: 'medium',
            ipAddress,
            userAgent,
            description: `Failed login attempt for non-existent user: ${email}`,
            details: { email, reason: 'user_not_found' }
        });

        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        // Log failed login attempt
        await SecurityEvent.create({
            user: user._id,
            eventType: 'failed_login',
            severity: 'medium',
            ipAddress,
            userAgent,
            description: `Failed login attempt for user: ${user.email}`,
            details: { email, reason: 'invalid_password' }
        });

        await AuditLog.createLog({
            user: user._id,
            action: 'failed_login',
            resourceType: 'User',
            resourceId: user._id.toString(),
            ipAddress,
            userAgent,
            success: false,
            details: { email, reason: 'invalid_password' }
        });

        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }

    // Check if user is active
    if (!user.isActive) {
        await SecurityEvent.create({
            user: user._id,
            eventType: 'failed_login',
            severity: 'high',
            ipAddress,
            userAgent,
            description: `Login attempt by inactive user: ${user.email}`,
            details: { email, reason: 'inactive_user' }
        });

        return res.status(401).json({
            success: false,
            error: 'Account is inactive. Please contact administrator.'
        });
    }

    // Update last login info
    user.lastLogin = new Date();
    user.lastLoginIp = ipAddress;
    await user.save();

    // Log successful login
    await AuditLog.createLog({
        user: user._id,
        action: 'login',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress,
        userAgent,
        details: { email }
    });

    logger.info(`User logged in: ${user.email} from ${ipAddress}`);

    sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
    // Log logout (skip in mock mode)
    if (!global.useMockDB) {
        try {
            await AuditLog.createLog({
                user: req.user.id,
                action: 'logout',
                resourceType: 'User',
                resourceId: req.user.id,
                ipAddress: getClientIP(req),
                userAgent: req.headers['user-agent']
            });
        } catch (_) { /* ignore audit errors */ }
    }

    // Clear refresh token cookie
    res.cookie('refreshToken', '', {
        expires: new Date(0),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (with refresh token)
exports.refreshToken = asyncHandler(async (req, res, next) => {
    const refreshTokenVal = req.cookies.refreshToken;

    if (!refreshTokenVal) {
        return res.status(401).json({
            success: false,
            error: 'No refresh token provided'
        });
    }

    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshTokenVal, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

        // In mock mode, just issue a new access token from decoded payload
        if (global.useMockDB) {
            const newToken = jwt.sign(
                { id: decoded.id, email: decoded.email || 'demo@medsecure.com', role: decoded.role || 'doctor' },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '24h' }
            );
            return res.status(200).json({ success: true, token: newToken, message: 'Token refreshed (demo mode)' });
        }
        
        // Get user
        const user = await User.findById(decoded.id);
        
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        // Generate new access token
        const newAccessToken = user.generateAuthToken();

        res.status(200).json({
            success: true,
            token: newAccessToken,
            message: 'Token refreshed successfully'
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token'
        });
    }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    // In mock mode, req.user is already populated by protect middleware
    if (global.useMockDB) {
        return res.status(200).json({
            success: true,
            data: req.user
        });
    }

    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
        await SecurityEvent.create({
            user: user._id,
            eventType: 'failed_login',
            severity: 'medium',
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            description: `Failed password change attempt - incorrect current password`,
            details: { userId: user._id }
        });

        return res.status(401).json({
            success: false,
            error: 'Current password is incorrect'
        });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log password change
    await AuditLog.createLog({
        user: user._id,
        action: 'password_change',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { changedBy: user._id }
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.status(200).json({
        success: true,
        message: 'Password updated successfully'
    });
});

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        // Don't reveal that user doesn't exist
        return res.status(200).json({
            success: true,
            message: 'If the email exists, a password reset link has been sent'
        });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set expire
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Log password reset request
    await AuditLog.createLog({
        user: user._id,
        action: 'password_reset_requested',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent']
    });

    // TODO: Send email with reset link
    // For now, just return the token (remove in production)
    
    res.status(200).json({
        success: true,
        message: 'Password reset email sent',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
});

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            error: 'Invalid or expired reset token'
        });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Log password reset
    await AuditLog.createLog({
        user: user._id,
        action: 'password_reset_completed',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent']
    });

    logger.info(`Password reset completed for user: ${user.email}`);

    sendTokenResponse(user, 200, res, 'Password reset successful');
});

// @desc    Verify JWT token
// @route   GET /api/auth/verify
// @access  Public (with token)
exports.verifyToken = asyncHandler(async (req, res, next) => {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'No token provided'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists
        const user = await User.findById(decoded.id);
        
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Token is no longer valid'
            });
        }

        res.status(200).json({
            success: true,
            valid: true,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            valid: false,
            error: 'Invalid token'
        });
    }
});