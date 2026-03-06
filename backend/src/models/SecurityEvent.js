const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Not required as some events may not be associated with a specific user
    },
    eventType: {
        type: String,
        required: [true, 'Event type is required'],
        enum: {
            values: [
                'failed_login', 'suspicious_access', 'data_breach_attempt',
                'unauthorized_export', 'session_hijack', 'brute_force',
                'privilege_escalation', 'data_tampering', 'malicious_query',
                'unusual_access_pattern', 'geo_anomaly', 'device_anomaly'
            ],
            message: 'Event type must be a valid security event type'
        }
    },
    severity: {
        type: String,
        required: [true, 'Severity is required'],
        enum: {
            values: ['low', 'medium', 'high', 'critical'],
            message: 'Severity must be one of: low, medium, high, critical'
        },
        default: 'medium'
    },
    ipAddress: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v);
            },
            message: 'Please provide a valid IP address'
        }
    },
    userAgent: {
        type: String,
        maxlength: [1000, 'User agent cannot exceed 1000 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Resolution Information
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    },
    resolution: {
        type: String,
        maxlength: [1000, 'Resolution cannot exceed 1000 characters']
    },
    
    // Risk Assessment
    riskScore: {
        type: Number,
        min: [0, 'Risk score must be positive'],
        max: [100, 'Risk score cannot exceed 100'],
        default: 0
    },
    automated: {
        type: Boolean,
        default: true // Most events will be automatically detected
    },
    
    // Additional Context
    sessionId: String,
    requestUrl: String,
    requestMethod: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    location: {
        country: String,
        region: String,
        city: String,
        latitude: Number,
        longitude: Number
    },
    deviceInfo: {
        deviceId: String,
        deviceType: String,
        os: String,
        browser: String
    },
    
    // Analysis
    falsePositive: {
        type: Boolean,
        default: false
    },
    notes: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for event age in hours
securityEventSchema.virtual('ageInHours').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for resolution time
securityEventSchema.virtual('resolutionTime').get(function() {
    if (!this.resolved || !this.resolvedAt) return null;
    return Math.floor((this.resolvedAt - this.createdAt) / (1000 * 60 * 60)); // in hours
});

// Virtual for severity level number
securityEventSchema.virtual('severityLevel').get(function() {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[this.severity] || 0;
});

// Indexes for performance
securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });
securityEventSchema.index({ resolved: 1, createdAt: -1 });
securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ eventType: 1, createdAt: -1 });
securityEventSchema.index({ ipAddress: 1, createdAt: -1 });
securityEventSchema.index({ riskScore: -1, createdAt: -1 });
securityEventSchema.index({ automated: 1, falsePositive: 1 });

// Method to resolve event
securityEventSchema.methods.resolve = function(resolvedBy, resolution) {
    this.resolved = true;
    this.resolvedBy = resolvedBy;
    this.resolvedAt = new Date();
    this.resolution = resolution;
    return this;
};

// Method to mark as false positive
securityEventSchema.methods.markAsFalsePositive = function(resolvedBy, notes) {
    this.falsePositive = true;
    this.resolved = true;
    this.resolvedBy = resolvedBy;
    this.resolvedAt = new Date();
    this.notes = notes;
    return this;
};

// Static method to get security summary
securityEventSchema.statics.getSecuritySummary = async function(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalEvents: { $sum: 1 },
                criticalEvents: {
                    $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
                },
                highEvents: {
                    $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
                },
                mediumEvents: {
                    $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
                },
                lowEvents: {
                    $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] }
                },
                resolvedEvents: {
                    $sum: { $cond: ['$resolved', 1, 0] }
                },
                unresolvedEvents: {
                    $sum: { $cond: [{ $not: '$resolved' }, 1, 0] }
                },
                falsePositives: {
                    $sum: { $cond: ['$falsePositive', 1, 0] }
                },
                averageRiskScore: { $avg: '$riskScore' },
                uniqueUsers: { $addToSet: '$user' },
                uniqueIPs: { $addToSet: '$ipAddress' }
            }
        },
        {
            $addFields: {
                uniqueUserCount: { $size: '$uniqueUsers' },
                uniqueIPCount: { $size: '$uniqueIPs' },
                resolutionRate: {
                    $multiply: [
                        { $divide: ['$resolvedEvents', '$totalEvents'] },
                        100
                    ]
                }
            }
        }
    ]);
};

// Static method to get events by severity over time
securityEventSchema.statics.getEventsBySeverityOverTime = async function(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    date: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    severity: '$severity'
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.date': 1, '_id.severity': 1 } }
    ]);
};

// Static method to get top threat IPs
securityEventSchema.statics.getTopThreatIPs = async function(days = 30, limit = 10) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate },
                ipAddress: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$ipAddress',
                eventCount: { $sum: 1 },
                severityScores: { $push: '$severityLevel' },
                latestEvent: { $max: '$createdAt' },
                eventTypes: { $addToSet: '$eventType' }
            }
        },
        {
            $addFields: {
                avgSeverity: { $avg: '$severityScores' },
                threatScore: {
                    $multiply: ['$eventCount', { $avg: '$severityScores' }]
                }
            }
        },
        { $sort: { threatScore: -1 } },
        { $limit: limit }
    ]);
};

// Pre-save middleware to calculate risk score automatically
securityEventSchema.pre('save', function(next) {
    if (this.isNew && this.riskScore === 0) {
        // Auto-calculate risk score based on severity and event type
        const severityScores = { low: 10, medium: 30, high: 60, critical: 90 };
        const eventTypeMultipliers = {
            'failed_login': 1.0,
            'suspicious_access': 1.2,
            'data_breach_attempt': 2.0,
            'unauthorized_export': 1.8,
            'session_hijack': 1.7,
            'brute_force': 1.5,
            'privilege_escalation': 2.0,
            'data_tampering': 1.9,
            'malicious_query': 1.6
        };
        
        const baseScore = severityScores[this.severity] || 10;
        const multiplier = eventTypeMultipliers[this.eventType] || 1.0;
        this.riskScore = Math.min(100, Math.round(baseScore * multiplier));
    }
    next();
});

// TTL index for automatic cleanup (keep events for 1 year)
securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);

// Additional models for security features
const deviceTrustScoreSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deviceId: {
        type: String,
        required: [true, 'Device ID is required'],
        maxlength: [255, 'Device ID cannot exceed 255 characters']
    },
    trustScore: {
        type: Number,
        required: [true, 'Trust score is required'],
        min: [0, 'Trust score must be between 0 and 100'],
        max: [100, 'Trust score must be between 0 and 100'],
        default: 100
    },
    lastVerified: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    deviceInfo: {
        userAgent: String,
        platform: String,
        version: String,
        fingerprint: String
    }
}, {
    timestamps: true
});

// Compound index for user-device uniqueness
deviceTrustScoreSchema.index({ user: 1, deviceId: 1 }, { unique: true });

const globalThreatScoreSchema = new mongoose.Schema({
    score: {
        type: Number,
        required: [true, 'Threat score is required'],
        min: [0, 'Threat score must be between 0 and 100'],
        max: [100, 'Threat score must be between 0 and 100'],
        default: 0
    },
    factors: {
        recentAttacks: Number,
        activeThreats: Number,
        systemLoad: Number,
        externalIntel: Number
    },
    calculatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Export all security-related models
module.exports.SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
module.exports.DeviceTrustScore = mongoose.model('DeviceTrustScore', deviceTrustScoreSchema);
module.exports.GlobalThreatScore = mongoose.model('GlobalThreatScore', globalThreatScoreSchema);