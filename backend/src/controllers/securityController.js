const { SecurityEvent, DeviceTrustScore, GlobalThreatScore, AuditLog } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

// Helper function to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// @desc    Get security events
// @route   GET /api/security/events
// @access  Private (Admin/Doctor)
exports.getSecurityEvents = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (!['admin', 'doctor'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view security events'
        });
    }

    const {
        page = 1,
        limit = 20,
        severity,
        eventType,
        resolved,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    let query = {};

    // Doctors can only see events related to them
    if (currentUser.role === 'doctor') {
        query.user = currentUser.id;
    }

    if (severity) query.severity = severity;
    if (eventType) query.eventType = eventType;
    if (resolved !== undefined) query.resolved = resolved === 'true';

    // Date range filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const events = await SecurityEvent.find(query)
        .populate('user', 'firstName lastName email role')
        .populate('resolvedBy', 'firstName lastName email')
        .sort(sort)
        .skip(parseInt(skip))
        .limit(parseInt(limit));

    const total = await SecurityEvent.countDocuments(query);

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'SecurityEvent',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_security_events',
            filters: { severity, eventType, resolved, startDate, endDate },
            totalResults: total
        }
    });

    res.status(200).json({
        success: true,
        data: events,
        pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
        }
    });
});

// @desc    Get single security event
// @route   GET /api/security/events/:id
// @access  Private (Admin/Doctor)
exports.getSecurityEvent = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const eventId = req.params.id;

    if (!['admin', 'doctor'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view security events'
        });
    }

    const event = await SecurityEvent.findById(eventId)
        .populate('user', 'firstName lastName email role')
        .populate('resolvedBy', 'firstName lastName email');

    if (!event) {
        return res.status(404).json({
            success: false,
            error: 'Security event not found'
        });
    }

    // Doctors can only view events related to them
    if (currentUser.role === 'doctor' && event.user && event.user._id.toString() !== currentUser.id) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view this security event'
        });
    }

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'SecurityEvent',
        resourceId: eventId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_security_event_detail',
            eventType: event.eventType,
            severity: event.severity
        }
    });

    res.status(200).json({
        success: true,
        data: event
    });
});

// @desc    Create security event
// @route   POST /api/security/events
// @access  Private (Admin only)
exports.createSecurityEvent = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to create security events'
        });
    }

    const eventData = {
        ...req.body,
        ipAddress: req.body.ipAddress || getClientIP(req),
        userAgent: req.body.userAgent || req.headers['user-agent'],
        automated: false // Manual creation
    };

    const event = await SecurityEvent.create(eventData);

    await event.populate('user', 'firstName lastName email role');

    // Log the creation
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'create',
        resourceType: 'SecurityEvent',
        resourceId: event._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            eventType: event.eventType,
            severity: event.severity,
            createdBy: currentUser.email,
            manual: true
        }
    });

    res.status(201).json({
        success: true,
        data: event,
        message: 'Security event created successfully'
    });
});

// @desc    Resolve security event
// @route   PUT /api/security/events/:id/resolve
// @access  Private (Admin only)
exports.resolveSecurityEvent = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const eventId = req.params.id;
    const { resolution, falsePositive = false } = req.body;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to resolve security events'
        });
    }

    const event = await SecurityEvent.findById(eventId);

    if (!event) {
        return res.status(404).json({
            success: false,
            error: 'Security event not found'
        });
    }

    if (event.resolved) {
        return res.status(400).json({
            success: false,
            error: 'Security event is already resolved'
        });
    }

    if (falsePositive) {
        event.markAsFalsePositive(currentUser.id, resolution);
    } else {
        event.resolve(currentUser.id, resolution);
    }

    await event.save();
    await event.populate('resolvedBy', 'firstName lastName email');

    // Log the resolution
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'update',
        resourceType: 'SecurityEvent',
        resourceId: eventId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'resolve_security_event',
            eventType: event.eventType,
            resolution: resolution,
            falsePositive: falsePositive,
            resolvedBy: currentUser.email
        }
    });

    res.status(200).json({
        success: true,
        data: event,
        message: `Security event ${falsePositive ? 'marked as false positive' : 'resolved'} successfully`
    });
});

// @desc    Get security summary/dashboard
// @route   GET /api/security/summary
// @access  Private (Admin only)
exports.getSecuritySummary = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view security summary'
        });
    }

    const { days = 30 } = req.query;

    const summary = await SecurityEvent.getSecuritySummary(parseInt(days));
    const eventsBySeverity = await SecurityEvent.getEventsBySeverityOverTime(7);
    const topThreatIPs = await SecurityEvent.getTopThreatIPs(parseInt(days), 5);

    // Get global threat score
    const globalThreat = await GlobalThreatScore.findOne().sort({ updatedAt: -1 });

    // Get recent critical events
    const recentCritical = await SecurityEvent.find({
        severity: 'critical',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        resolved: false
    }).limit(5).populate('user', 'firstName lastName email');

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'SecurityEvent',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { action: 'view_security_summary', days }
    });

    res.status(200).json({
        success: true,
        data: {
            summary: summary[0] || {},
            eventsBySeverityOverTime: eventsBySeverity,
            topThreatIPs,
            globalThreatScore: globalThreat?.score || 0,
            recentCriticalEvents: recentCritical
        }
    });
});

// @desc    Get device trust scores
// @route   GET /api/security/devices
// @access  Private
exports.getDeviceTrustScores = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const { userId } = req.query;

    let query = {};

    if (currentUser.role === 'admin' && userId) {
        query.user = userId;
    } else {
        query.user = currentUser.id;
    }

    const devices = await DeviceTrustScore.find(query)
        .populate('user', 'firstName lastName email')
        .sort({ trustScore: -1, lastVerified: -1 });

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'DeviceTrustScore',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { action: 'view_device_trust_scores', targetUser: userId }
    });

    res.status(200).json({
        success: true,
        data: devices
    });
});

// @desc    Update device trust score
// @route   PUT /api/security/devices/:deviceId
// @access  Private (Admin only)
exports.updateDeviceTrustScore = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const deviceId = req.params.deviceId;
    const { trustScore, notes } = req.body;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to update device trust scores'
        });
    }

    if (trustScore < 0 || trustScore > 100) {
        return res.status(400).json({
            success: false,
            error: 'Trust score must be between 0 and 100'
        });
    }

    const device = await DeviceTrustScore.findOneAndUpdate(
        { deviceId },
        {
            trustScore,
            notes,
            lastVerified: new Date()
        },
        { new: true, upsert: true }
    ).populate('user', 'firstName lastName email');

    // Log the update
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'update',
        resourceType: 'DeviceTrustScore',
        resourceId: device._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            deviceId,
            newTrustScore: trustScore,
            notes,
            updatedBy: currentUser.email
        }
    });

    res.status(200).json({
        success: true,
        data: device,
        message: 'Device trust score updated successfully'
    });
});

// @desc    Get/Update global threat score
// @route   GET/PUT /api/security/threat-level
// @access  Private (Admin only)
exports.getGlobalThreatScore = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view global threat score'
        });
    }

    const threatScore = await GlobalThreatScore.findOne().sort({ updatedAt: -1 });

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'GlobalThreatScore',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { action: 'view_global_threat_score' }
    });

    res.status(200).json({
        success: true,
        data: threatScore || { score: 0, calculatedAt: new Date() }
    });
});

exports.updateGlobalThreatScore = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const { score, factors } = req.body;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to update global threat score'
        });
    }

    if (score < 0 || score > 100) {
        return res.status(400).json({
            success: false,
            error: 'Threat score must be between 0 and 100'
        });
    }

    // Create new threat score entry
    const threatScore = await GlobalThreatScore.create({
        score,
        factors: factors || {},
        calculatedAt: new Date()
    });

    // Log the update
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'update',
        resourceType: 'GlobalThreatScore',
        resourceId: threatScore._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            newScore: score,
            factors: factors,
            updatedBy: currentUser.email
        }
    });

    res.status(200).json({
        success: true,
        data: threatScore,
        message: 'Global threat score updated successfully'
    });
});

// @desc    Get security statistics
// @route   GET /api/security/stats
// @access  Private (Admin only)
exports.getSecurityStats = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view security statistics'
        });
    }

    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Event statistics
    const eventStats = await SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: '$eventType',
                count: { $sum: 1 },
                avgRiskScore: { $avg: '$riskScore' },
                criticalCount: {
                    $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
                }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Resolution statistics
    const resolutionStats = await SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: startDate }, resolved: true } },
        {
            $group: {
                _id: null,
                avgResolutionTime: {
                    $avg: {
                        $divide: [
                            { $subtract: ['$resolvedAt', '$createdAt'] },
                            1000 * 60 * 60 // Convert to hours
                        ]
                    }
                },
                falsePositiveRate: {
                    $avg: { $cond: ['$falsePositive', 1, 0] }
                }
            }
        }
    ]);

    // Device trust statistics
    const deviceStats = await DeviceTrustScore.aggregate([
        {
            $group: {
                _id: null,
                totalDevices: { $sum: 1 },
                avgTrustScore: { $avg: '$trustScore' },
                lowTrustDevices: {
                    $sum: { $cond: [{ $lt: ['$trustScore', 50] }, 1, 0] }
                }
            }
        }
    ]);

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'SecurityEvent',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { action: 'view_security_statistics', days }
    });

    res.status(200).json({
        success: true,
        data: {
            eventStatistics: eventStats,
            resolutionStatistics: resolutionStats[0] || {
                avgResolutionTime: 0,
                falsePositiveRate: 0
            },
            deviceStatistics: deviceStats[0] || {
                totalDevices: 0,
                avgTrustScore: 0,
                lowTrustDevices: 0
            }
        }
    });
});