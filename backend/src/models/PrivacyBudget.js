const mongoose = require('mongoose');

const privacyBudgetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: [true, 'Patient is required']
    },
    
    // Privacy Budget Parameters
    epsilon: {
        type: Number,
        required: [true, 'Epsilon value is required'],
        min: [0, 'Epsilon must be positive'],
        max: [10, 'Epsilon cannot exceed 10'],
        default: parseFloat(process.env.DEFAULT_EPSILON) || 1.0
    },
    delta: {
        type: Number,
        required: [true, 'Delta value is required'],
        min: [0, 'Delta must be positive'],
        max: [1, 'Delta cannot exceed 1'],
        default: parseFloat(process.env.DEFAULT_DELTA) || 0.00001
    },
    totalBudget: {
        type: Number,
        required: [true, 'Total budget is required'],
        min: [0, 'Total budget must be positive'],
        default: parseFloat(process.env.DEFAULT_PRIVACY_BUDGET) || 10.0
    },
    consumedBudget: {
        type: Number,
        required: [true, 'Consumed budget is required'],
        min: [0, 'Consumed budget cannot be negative'],
        default: 0.0,
        validate: {
            validator: function(value) {
                return value <= this.totalBudget;
            },
            message: 'Consumed budget cannot exceed total budget'
        }
    },
    
    // Query Tracking
    queryCount: {
        type: Number,
        required: [true, 'Query count is required'],
        min: [0, 'Query count cannot be negative'],
        default: 0
    },
    lastQueryAt: {
        type: Date
    },
    queries: [{
        timestamp: { type: Date, default: Date.now },
        queryType: {
            type: String,
            enum: ['read', 'aggregate', 'export', 'analysis'],
            required: true
        },
        epsilonUsed: {
            type: Number,
            required: true,
            min: 0
        },
        description: String,
        result: mongoose.Schema.Types.Mixed
    }],
    
    // Budget Management
    resetAt: {
        type: Date
    },
    resetPeriod: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly', 'never'],
        default: 'monthly'
    },
    autoReset: {
        type: Boolean,
        default: true
    },
    
    // Status and Metadata
    status: {
        type: String,
        enum: ['active', 'exhausted', 'suspended', 'reset_pending'],
        default: 'active'
    },
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for remaining budget
privacyBudgetSchema.virtual('remainingBudget').get(function() {
    return Math.max(0, this.totalBudget - this.consumedBudget);
});

// Virtual for budget percentage used
privacyBudgetSchema.virtual('budgetPercentage').get(function() {
    if (this.totalBudget === 0) return 0;
    return Math.min(100, (this.consumedBudget / this.totalBudget) * 100);
});

// Virtual for budget status
privacyBudgetSchema.virtual('budgetStatus').get(function() {
    const percentage = this.budgetPercentage;
    if (percentage >= 100) return 'exhausted';
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
});

// Virtual for next reset date
privacyBudgetSchema.virtual('nextResetDate').get(function() {
    if (!this.resetAt || this.resetPeriod === 'never') return null;
    
    const resetDate = new Date(this.resetAt);
    switch (this.resetPeriod) {
        case 'daily':
            resetDate.setDate(resetDate.getDate() + 1);
            break;
        case 'weekly':
            resetDate.setDate(resetDate.getDate() + 7);
            break;
        case 'monthly':
            resetDate.setMonth(resetDate.getMonth() + 1);
            break;
        case 'yearly':
            resetDate.setFullYear(resetDate.getFullYear() + 1);
            break;
    }
    return resetDate;
});

// Compound index to ensure unique user-patient combination
privacyBudgetSchema.index({ user: 1, patient: 1 }, { unique: true });

// Indexes for performance
privacyBudgetSchema.index({ user: 1, updatedAt: -1 });
privacyBudgetSchema.index({ patient: 1, updatedAt: -1 });
privacyBudgetSchema.index({ budgetStatus: 1 });
privacyBudgetSchema.index({ status: 1 });
privacyBudgetSchema.index({ resetAt: 1 });

// Method to consume privacy budget
privacyBudgetSchema.methods.consumeBudget = function(epsilon, queryType = 'read', description = '') {
    if (this.remainingBudget < epsilon) {
        throw new Error(`Insufficient privacy budget. Required: ${epsilon}, Available: ${this.remainingBudget}`);
    }
    
    this.consumedBudget += epsilon;
    this.queryCount += 1;
    this.lastQueryAt = new Date();
    
    // Add query to history
    this.queries.push({
        queryType,
        epsilonUsed: epsilon,
        description
    });
    
    // Update status if budget is exhausted
    if (this.consumedBudget >= this.totalBudget) {
        this.status = 'exhausted';
    }
    
    return this;
};

// Method to reset privacy budget
privacyBudgetSchema.methods.resetBudget = function() {
    this.consumedBudget = 0;
    this.queryCount = 0;
    this.resetAt = new Date();
    this.status = 'active';
    this.queries = [];
    return this;
};

// Method to check if reset is due
privacyBudgetSchema.methods.isResetDue = function() {
    if (!this.autoReset || this.resetPeriod === 'never' || !this.resetAt) {
        return false;
    }
    
    const now = new Date();
    const resetDate = new Date(this.resetAt);
    
    switch (this.resetPeriod) {
        case 'daily':
            return now.getTime() - resetDate.getTime() >= 24 * 60 * 60 * 1000;
        case 'weekly':
            return now.getTime() - resetDate.getTime() >= 7 * 24 * 60 * 60 * 1000;
        case 'monthly':
            return now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear();
        case 'yearly':
            return now.getFullYear() !== resetDate.getFullYear();
        default:
            return false;
    }
};

// Static method to find budgets that need reset
privacyBudgetSchema.statics.findBudgetsNeedingReset = function() {
    return this.find({
        autoReset: true,
        resetPeriod: { $ne: 'never' },
        status: { $ne: 'suspended' }
    }).populate('user patient');
};

// Static method to get user's privacy budget usage summary
privacyBudgetSchema.statics.getUserBudgetSummary = function(userId) {
    return this.aggregate([
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalBudgets: { $sum: 1 },
                totalConsumed: { $sum: '$consumedBudget' },
                totalAvailable: { $sum: '$totalBudget' },
                averagePercentage: { $avg: { $multiply: [{ $divide: ['$consumedBudget', '$totalBudget'] }, 100] } },
                exhaustedBudgets: {
                    $sum: { $cond: [{ $gte: ['$consumedBudget', '$totalBudget'] }, 1, 0] }
                }
            }
        }
    ]);
};

// Pre-save middleware to update status
privacyBudgetSchema.pre('save', function(next) {
    if (this.consumedBudget >= this.totalBudget) {
        this.status = 'exhausted';
    } else if (this.status === 'exhausted' && this.consumedBudget < this.totalBudget) {
        this.status = 'active';
    }
    next();
});

module.exports = mongoose.model('PrivacyBudget', privacyBudgetSchema);