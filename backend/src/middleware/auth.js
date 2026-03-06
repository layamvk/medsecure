const jwt = require('jsonwebtoken');
const { User, AuditLog, SecurityEvent } = require('../models');
const { asyncHandler } = require('./errorHandler');

// Helper function to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// Protect routes - authenticate token
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Demo user tokens (mock-*) or mock DB mode — resolve from token payload
        if (global.useMockDB || (decoded.id && String(decoded.id).startsWith('mock-'))) {
            req.user = {
                _id: decoded.id,
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                firstName: decoded.email ? decoded.email.split('@')[0] : 'Demo',
                lastName: 'User',
                isActive: true,
                username: decoded.email ? decoded.email.split('@')[0] : 'demo',
            };
            return next();
        }

        // Get user from the token
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if user is active
        if (!req.user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User account is inactive'
            });
        }

        next();

    } catch (error) {
        // Log failed authentication attempt (skip in mock mode)
        if (!global.useMockDB) {
            try {
                await SecurityEvent.create({
                    eventType: 'failed_login',
                    severity: 'medium',
                    ipAddress: getClientIP(req),
                    userAgent: req.headers['user-agent'],
                    description: 'Invalid or expired JWT token used',
                    details: {
                        error: error.message,
                        token: token.substring(0, 20) + '...'
                    }
                });
            } catch (_) { /* ignore logging errors */ }
        }

        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }
});

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            // Log unauthorized access attempt
            AuditLog.createLog({
                user: req.user.id,
                action: 'access_denied',
                resourceType: 'Authorization',
                ipAddress: getClientIP(req),
                userAgent: req.headers['user-agent'],
                success: false,
                details: {
                    requiredRoles: roles,
                    userRole: req.user.role,
                    path: req.originalUrl
                }
            });

            return res.status(403).json({
                success: false,
                error: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

// Admin only middleware
const adminOnly = authorize('admin');

// Admin or Doctor middleware
const adminOrDoctor = authorize('admin', 'doctor');

// Healthcare staff middleware (admin, doctor, nurse, receptionist)
const healthcareStaff = authorize('admin', 'doctor', 'nurse', 'receptionist');

// Optional authentication - doesn't fail if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user?.isActive) {
                req.user = null;
            }
        } catch (error) {
            req.user = null;
        }
    }

    next();
});

// Rate limiting for sensitive operations
const sensitiveOperation = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required for sensitive operations'
        });
    }

    // Check for recent failed attempts
    const recentFailures = await SecurityEvent.countDocuments({
        user: req.user.id,
        eventType: { $in: ['failed_login', 'access_denied'] },
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
        success: false
    });

    if (recentFailures >= 3) {
        await SecurityEvent.create({
            user: req.user.id,
            eventType: 'suspicious_access',
            severity: 'high',
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            description: 'Multiple recent failed attempts detected during sensitive operation',
            details: {
                recentFailures,
                path: req.originalUrl,
                method: req.method
            }
        });

        return res.status(429).json({
            success: false,
            error: 'Too many recent failures. Please try again later.'
        });
    }

    next();
});

// Device trust validation
const requireTrustedDevice = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    // Get device ID from headers or generate from user agent
    const deviceId = req.headers['x-device-id'] || 
                    require('crypto').createHash('md5')
                    .update(req.headers['user-agent'] + getClientIP(req))
                    .digest('hex');

    // Check device trust score
    const { DeviceTrustScore } = require('../models');
    const deviceTrust = await DeviceTrustScore.findOne({
        user: req.user.id,
        deviceId
    });

    // If device has low trust score, require additional verification
    if (deviceTrust && deviceTrust.trustScore < 50) {
        await SecurityEvent.create({
            user: req.user.id,
            eventType: 'device_anomaly',
            severity: 'medium',
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            description: 'Access attempt from low-trust device',
            details: {
                deviceId,
                trustScore: deviceTrust.trustScore,
                path: req.originalUrl
            }
        });

        return res.status(403).json({
            success: false,
            error: 'Device not trusted. Additional verification required.',
            trustScore: deviceTrust.trustScore
        });
    }

    // Update device info if exists
    if (deviceTrust) {
        deviceTrust.lastVerified = new Date();
        await deviceTrust.save();
    }

    req.deviceId = deviceId;
    next();
});

// IP whitelist middleware (for admin operations)
const requireWhitelistedIP = (req, res, next) => {
    const clientIP = getClientIP(req);
    const whitelistedIPs = (process.env.WHITELISTED_IPS || '').split(',').map(ip => ip.trim());

    if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(clientIP)) {
        SecurityEvent.create({
            user: req.user?.id,
            eventType: 'unauthorized_access',
            severity: 'critical',
            ipAddress: clientIP,
            userAgent: req.headers['user-agent'],
            description: 'Access attempt from non-whitelisted IP address',
            details: {
                path: req.originalUrl,
                method: req.method,
                whitelistedIPs
            }
        });

        return res.status(403).json({
            success: false,
            error: 'Access denied from this IP address'
        });
    }

    next();
};

// Time-based access control
const businessHoursOnly = (req, res, next) => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Business hours: Monday-Friday, 8 AM - 6 PM
    const isBusinessDay = day >= 1 && day <= 5;
    const isBusinessHour = hour >= 8 && hour < 18;

    if (!isBusinessDay || !isBusinessHour) {
        // Allow admin access outside business hours
        if (req.user?.role !== 'admin') {
            SecurityEvent.create({
                user: req.user?.id,
                eventType: 'suspicious_access',
                severity: 'medium',
                ipAddress: getClientIP(req),
                userAgent: req.headers['user-agent'],
                description: 'Access attempt outside business hours',
                details: {
                    timestamp: now.toISOString(),
                    path: req.originalUrl,
                    userRole: req.user?.role
                }
            });

            return res.status(403).json({
                success: false,
                error: 'Access restricted to business hours (Mon-Fri, 8 AM - 6 PM)'
            });
        }
    }

    next();
};

module.exports = {
    protect,
    authorize,
    adminOnly,
    adminOrDoctor,
    healthcareStaff,
    optionalAuth,
    sensitiveOperation,
    requireTrustedDevice,
    requireWhitelistedIP,
    businessHoursOnly
};