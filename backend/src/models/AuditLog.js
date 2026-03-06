const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required for audit log']
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: {
            values: [
                'create', 'read', 'update', 'delete',
                'login', 'logout', 'failed_login',
                'export', 'access_denied', 'password_change',
                'role_change', 'privacy_access', 'data_export'
            ],
            message: 'Action must be a valid audit action'
        }
    },
    resourceType: {
        type: String,
        required: [true, 'Resource type is required'],
        enum: {
            values: ['User', 'Patient', 'AuditLog', 'SecurityEvent', 'PrivacyBudget', 'Query'],
            message: 'Resource type must be a valid model name'
        }
    },
    resourceId: {
        type: String,
        validate: {
            validator: function (v) {
                // Allow empty string for actions that don't target specific resources
                return !v || mongoose.Types.ObjectId.isValid(v);
            },
            message: 'Resource ID must be a valid ObjectId'
        }
    },
    ipAddress: {
        type: String,
        validate: {
            validator: function (v) {
                if (!v) return true;

                // IPv4 pattern
                const ipv4 = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
                // IPv6 pattern (simplified)
                const ipv6 = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
                // IPv6 localhost
                const ipv6Local = /^::1$/;
                // IPv4-mapped IPv6
                const ipv4Mapped = /^::ffff:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;

                return ipv4.test(v) || ipv6.test(v) || ipv6Local.test(v) || ipv4Mapped.test(v);
            },
            message: 'Please provide a valid IP address'
        }
    },
    userAgent: {
        type: String,
        maxlength: [1000, 'User agent cannot exceed 1000 characters']
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    success: {
        type: Boolean,
        required: [true, 'Success status is required'],
        default: true
    },
    errorMessage: {
        type: String,
        maxlength: [500, 'Error message cannot exceed 500 characters']
    },
    sessionId: String,
    requestMethod: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    requestUrl: String,
    responseTime: Number, // in milliseconds
    dataChanged: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for formatted timestamp
auditLogSchema.virtual('formattedTimestamp').get(function () {
    return this.createdAt.toLocaleString();
});

// Indexes for performance
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ success: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// Static method to create audit log entry
auditLogSchema.statics.createLog = async function (logData) {
    try {
        const auditLog = new this(logData);
        await auditLog.save();
        return auditLog;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error as audit logging should not break application flow
        return null;
    }
};

// Static method to get user activity summary
auditLogSchema.statics.getUserActivitySummary = async function (userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
        {
            $match: {
                user: mongoose.Types.ObjectId(userId),
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    action: '$action',
                    resourceType: '$resourceType'
                },
                count: { $sum: 1 },
                lastActivity: { $max: '$createdAt' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

// Static method to get system activity by time period
auditLogSchema.statics.getActivityByPeriod = async function (period = 'daily', days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let groupBy;
    switch (period) {
        case 'hourly':
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' },
                hour: { $hour: '$createdAt' }
            };
            break;
        case 'daily':
        default:
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
            };
            break;
    }

    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: groupBy,
                totalActions: { $sum: 1 },
                successfulActions: {
                    $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
                },
                failedActions: {
                    $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
                },
                uniqueUsers: { $addToSet: '$user' }
            }
        },
        {
            $addFields: {
                uniqueUserCount: { $size: '$uniqueUsers' }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
        }
    ]);
};

// TTL index for automatic cleanup (keep logs for 2 years)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);