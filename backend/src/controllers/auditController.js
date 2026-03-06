const { AuditLog } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

// Helper function to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// @desc    Get audit logs
// @route   GET /api/audit
// @access  Private (Admin/Doctor)
exports.getAuditLogs = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    // Check permissions
    if (!['admin', 'doctor'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view audit logs'
        });
    }

    const {
        page = 1,
        limit = 50,
        userId,
        action,
        resourceType,
        success,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Doctors can only see their own audit logs
    if (currentUser.role === 'doctor') {
        query.user = currentUser.id;
    }

    // Filter by user (admin only)
    if (userId && currentUser.role === 'admin') {
        query.user = userId;
    }

    if (action) {
        query.action = action;
    }

    if (resourceType) {
        query.resourceType = resourceType;
    }

    if (success !== undefined) {
        query.success = success === 'true';
    }

    // Date range filter
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const auditLogs = await AuditLog.find(query)
        .populate('user', 'firstName lastName email role')
        .sort(sort)
        .skip(parseInt(skip))
        .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    // Log this access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'AuditLog',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_audit_logs',
            filters: { userId, action, resourceType, success, startDate, endDate },
            totalResults: total
        }
    });

    res.status(200).json({
        success: true,
        data: auditLogs,
        pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
        }
    });
});

// @desc    Get audit log by ID
// @route   GET /api/audit/:id
// @access  Private (Admin/Doctor)
exports.getAuditLog = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const auditLogId = req.params.id;

    if (!['admin', 'doctor'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view audit logs'
        });
    }

    const auditLog = await AuditLog.findById(auditLogId)
        .populate('user', 'firstName lastName email role');

    if (!auditLog) {
        return res.status(404).json({
            success: false,
            error: 'Audit log not found'
        });
    }

    // Doctors can only view their own audit logs
    if (currentUser.role === 'doctor' && auditLog.user._id.toString() !== currentUser.id) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view this audit log'
        });
    }

    // Log this access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'AuditLog',
        resourceId: auditLogId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_audit_log_detail',
            viewedLog: auditLogId
        }
    });

    res.status(200).json({
        success: true,
        data: auditLog
    });
});

// @desc    Get user activity summary
// @route   GET /api/audit/user/:userId/summary
// @access  Private (Admin only)
exports.getUserActivitySummary = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const targetUserId = req.params.userId;
    const { days = 30 } = req.query;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view user activity summaries'
        });
    }

    const summary = await AuditLog.getUserActivitySummary(targetUserId, parseInt(days));

    // Log this access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'AuditLog',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_user_activity_summary',
            targetUser: targetUserId,
            days
        }
    });

    res.status(200).json({
        success: true,
        data: summary
    });
});

// @desc    Get system activity by period
// @route   GET /api/audit/activity
// @access  Private (Admin only)
exports.getSystemActivity = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view system activity'
        });
    }

    const { period = 'daily', days = 7 } = req.query;

    const activity = await AuditLog.getActivityByPeriod(period, parseInt(days));

    // Log this access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'AuditLog',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_system_activity',
            period,
            days
        }
    });

    res.status(200).json({
        success: true,
        data: activity
    });
});

// @desc    Get audit statistics
// @route   GET /api/audit/stats
// @access  Private (Admin only)
exports.getAuditStats = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view audit statistics'
        });
    }

    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await AuditLog.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: null,
                totalLogs: { $sum: 1 },
                successfulActions: {
                    $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
                },
                failedActions: {
                    $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
                },
                uniqueUsers: { $addToSet: '$user' },
                actionBreakdown: { $push: '$action' },
                resourceBreakdown: { $push: '$resourceType' }
            }
        },
        {
            $addFields: {
                uniqueUserCount: { $size: '$uniqueUsers' },
                successRate: {
                    $multiply: [
                        { $divide: ['$successfulActions', '$totalLogs'] },
                        100
                    ]
                }
            }
        }
    ]);

    // Get action distribution
    const actionStats = await AuditLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    // Log this access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'AuditLog',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_audit_statistics',
            days
        }
    });

    res.status(200).json({
        success: true,
        data: {
            summary: stats[0] || {
                totalLogs: 0,
                successfulActions: 0,
                failedActions: 0,
                uniqueUserCount: 0,
                successRate: 0
            },
            actionDistribution: actionStats
        }
    });
});

// @desc    Export audit logs
// @route   GET /api/audit/export
// @access  Private (Admin only)
exports.exportAuditLogs = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to export audit logs'
        });
    }

    const { format = 'json', startDate, endDate, userId, action } = req.query;

    // Build query
    let query = {};
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (userId) query.user = userId;
    if (action) query.action = action;

    const auditLogs = await AuditLog.find(query)
        .populate('user', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .limit(10000); // Limit exports to prevent memory issues

    // Log the export
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'export',
        resourceType: 'AuditLog',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'export_audit_logs',
            format,
            filters: { startDate, endDate, userId, action },
            recordCount: auditLogs.length
        }
    });

    if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = [
            'Timestamp',
            'User',
            'Email', 
            'Action',
            'Resource Type',
            'Resource ID',
            'Success',
            'IP Address',
            'Details'
        ].join(',');

        const csvRows = auditLogs.map(log => [
            log.createdAt.toISOString(),
            log.user ? `"${log.user.firstName} ${log.user.lastName}"` : 'Unknown',
            log.user ? log.user.email : 'Unknown',
            log.action,
            log.resourceType,
            log.resourceId || '',
            log.success,
            log.ipAddress || '',
            `"${JSON.stringify(log.details).replace(/"/g, '""')}"`
        ].join(',')).join('\n');

        const csvContent = csvHeaders + '\n' + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.send(csvContent);
    } else {
        // Return JSON format
        res.status(200).json({
            success: true,
            data: auditLogs,
            meta: {
                exportedAt: new Date().toISOString(),
                totalRecords: auditLogs.length,
                filters: { startDate, endDate, userId, action }
            }
        });
    }
});