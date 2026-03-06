const { PrivacyBudget, Patient, AuditLog } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

// Helper function to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// @desc    Get user's privacy budgets
// @route   GET /api/privacy
// @access  Private
exports.getPrivacyBudgets = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const { page = 1, limit = 10, patientId, status } = req.query;

    let query = {};

    if (currentUser.role === 'admin') {
        // Admin can see all budgets, optionally filtered by patient
        if (patientId) query.patient = patientId;
    } else {
        // Other users can only see their own budgets
        query.user = currentUser.id;
        if (patientId) query.patient = patientId;
    }

    if (status) {
        query.status = status;
    }

    const skip = (page - 1) * limit;

    const budgets = await PrivacyBudget.find(query)
        .populate('user', 'firstName lastName email role')
        .populate('patient', 'patientId firstName lastName sensitivityLevel')
        .populate('createdBy', 'firstName lastName email')
        .sort({ updatedAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit));

    const total = await PrivacyBudget.countDocuments(query);

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'PrivacyBudget',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_privacy_budgets',
            filters: { patientId, status },
            totalResults: total
        }
    });

    res.status(200).json({
        success: true,
        data: budgets,
        pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
        }
    });
});

// @desc    Get specific privacy budget
// @route   GET /api/privacy/:id
// @access  Private
exports.getPrivacyBudget = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const budgetId = req.params.id;

    const budget = await PrivacyBudget.findById(budgetId)
        .populate('user', 'firstName lastName email role')
        .populate('patient', 'patientId firstName lastName sensitivityLevel')
        .populate('createdBy', 'firstName lastName email');

    if (!budget) {
        return res.status(404).json({
            success: false,
            error: 'Privacy budget not found'
        });
    }

    // Check permissions
    if (currentUser.role !== 'admin' && budget.user._id.toString() !== currentUser.id) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view this privacy budget'
        });
    }

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'PrivacyBudget',
        resourceId: budgetId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            budgetFor: budget.patient.patientId,
            budgetUser: budget.user.email
        }
    });

    res.status(200).json({
        success: true,
        data: budget
    });
});

// @desc    Create privacy budget
// @route   POST /api/privacy
// @access  Private (Admin/Doctor)
exports.createPrivacyBudget = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (!['admin', 'doctor'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to create privacy budgets'
        });
    }

    const { user, patient, totalBudget, epsilon, delta, resetPeriod, autoReset } = req.body;

    // Verify patient exists and user has access
    const patientRecord = await Patient.findById(patient);
    if (!patientRecord) {
        return res.status(404).json({
            success: false,
            error: 'Patient not found'
        });
    }

    // Check if budget already exists for this user-patient combination
    const existingBudget = await PrivacyBudget.findOne({ user, patient });
    if (existingBudget) {
        return res.status(400).json({
            success: false,
            error: 'Privacy budget already exists for this user-patient combination'
        });
    }

    // Create privacy budget
    const budget = await PrivacyBudget.create({
        user,
        patient,
        totalBudget: totalBudget || parseFloat(process.env.DEFAULT_PRIVACY_BUDGET) || 10.0,
        epsilon: epsilon || parseFloat(process.env.DEFAULT_EPSILON) || 1.0,
        delta: delta || parseFloat(process.env.DEFAULT_DELTA) || 0.00001,
        resetPeriod: resetPeriod || 'monthly',
        autoReset: autoReset !== false,
        createdBy: currentUser.id
    });

    await budget.populate('user', 'firstName lastName email role');
    await budget.populate('patient', 'patientId firstName lastName sensitivityLevel');
    await budget.populate('createdBy', 'firstName lastName email');

    // Log the creation
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'create',
        resourceType: 'PrivacyBudget',
        resourceId: budget._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            budgetUser: budget.user.email,
            patient: budget.patient.patientId,
            totalBudget: budget.totalBudget,
            createdBy: currentUser.email
        }
    });

    res.status(201).json({
        success: true,
        data: budget,
        message: 'Privacy budget created successfully'
    });
});

// @desc    Update privacy budget
// @route   PUT /api/privacy/:id
// @access  Private (Admin only)
exports.updatePrivacyBudget = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const budgetId = req.params.id;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to update privacy budgets'
        });
    }

    const budget = await PrivacyBudget.findById(budgetId);
    if (!budget) {
        return res.status(404).json({
            success: false,
            error: 'Privacy budget not found'
        });
    }

    const originalData = budget.toObject();
    
    const allowedFields = ['totalBudget', 'epsilon', 'delta', 'resetPeriod', 'autoReset', 'status', 'notes'];
    const updateData = {};
    
    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    // Update budget
    const updatedBudget = await PrivacyBudget.findByIdAndUpdate(
        budgetId,
        updateData,
        { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email role')
     .populate('patient', 'patientId firstName lastName sensitivityLevel')
     .populate('createdBy', 'firstName lastName email');

    // Track changes
    const changes = {};
    Object.keys(updateData).forEach(key => {
        if (originalData[key] !== updateData[key]) {
            changes[key] = {
                from: originalData[key],
                to: updateData[key]
            };
        }
    });

    // Log the update
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'update',
        resourceType: 'PrivacyBudget',
        resourceId: budgetId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            budgetUser: updatedBudget.user.email,
            patient: updatedBudget.patient.patientId,
            changes,
            updatedBy: currentUser.email
        }
    });

    res.status(200).json({
        success: true,
        data: updatedBudget,
        message: 'Privacy budget updated successfully'
    });
});

// @desc    Reset privacy budget
// @route   POST /api/privacy/:id/reset
// @access  Private (Admin/Doctor)
exports.resetPrivacyBudget = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const budgetId = req.params.id;

    if (!['admin', 'doctor'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to reset privacy budgets'
        });
    }

    const budget = await PrivacyBudget.findById(budgetId)
        .populate('user', 'firstName lastName email role')
        .populate('patient', 'patientId firstName lastName sensitivityLevel');

    if (!budget) {
        return res.status(404).json({
            success: false,
            error: 'Privacy budget not found'
        });
    }

    // Check if user can reset this budget
    if (currentUser.role !== 'admin' && budget.user._id.toString() !== currentUser.id) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to reset this privacy budget'
        });
    }

    // Store original values for logging
    const originalConsumed = budget.consumedBudget;
    const originalQueries = budget.queryCount;

    // Reset the budget
    budget.resetBudget();
    await budget.save();

    // Log the reset
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'update',
        resourceType: 'PrivacyBudget',
        resourceId: budgetId,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'reset_privacy_budget',
            budgetUser: budget.user.email,
            patient: budget.patient.patientId,
            previouslyConsumed: originalConsumed,
            previousQueries: originalQueries,
            resetBy: currentUser.email
        }
    });

    res.status(200).json({
        success: true,
        data: budget,
        message: 'Privacy budget reset successfully'
    });
});

// @desc    Consume privacy budget
// @route   POST /api/privacy/:id/consume
// @access  Private
exports.consumePrivacyBudget = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const budgetId = req.params.id;
    const { epsilon, queryType = 'read', description = '' } = req.body;

    if (!epsilon || epsilon <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Valid epsilon value is required'
        });
    }

    const budget = await PrivacyBudget.findById(budgetId)
        .populate('user', 'firstName lastName email role')
        .populate('patient', 'patientId firstName lastName sensitivityLevel');

    if (!budget) {
        return res.status(404).json({
            success: false,
            error: 'Privacy budget not found'
        });
    }

    // Check if user can consume from this budget
    if (budget.user._id.toString() !== currentUser.id) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to consume from this privacy budget'
        });
    }

    try {
        // Consume the budget
        budget.consumeBudget(epsilon, queryType, description);
        await budget.save();

        // Log the consumption
        await AuditLog.createLog({
            user: currentUser.id,
            action: 'privacy_access',
            resourceType: 'PrivacyBudget',
            resourceId: budgetId,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            details: {
                action: 'consume_privacy_budget',
                patient: budget.patient.patientId,
                epsilonUsed: epsilon,
                queryType,
                description,
                remainingBudget: budget.remainingBudget
            }
        });

        res.status(200).json({
            success: true,
            data: {
                consumedBudget: budget.consumedBudget,
                remainingBudget: budget.remainingBudget,
                budgetPercentage: budget.budgetPercentage,
                budgetStatus: budget.budgetStatus,
                queryCount: budget.queryCount
            },
            message: 'Privacy budget consumed successfully'
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// @desc    Get user's budget summary
// @route   GET /api/privacy/summary
// @access  Private
exports.getUserBudgetSummary = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    const summary = await PrivacyBudget.getUserBudgetSummary(currentUser.id);

    // Get individual budgets for the user
    const userBudgets = await PrivacyBudget.find({ user: currentUser.id })
        .populate('patient', 'patientId firstName lastName sensitivityLevel')
        .sort({ updatedAt: -1 });

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'PrivacyBudget',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { action: 'view_budget_summary' }
    });

    res.status(200).json({
        success: true,
        data: {
            summary: summary[0] || {
                totalBudgets: 0,
                totalConsumed: 0,
                totalAvailable: 0,
                averagePercentage: 0,
                exhaustedBudgets: 0
            },
            budgets: userBudgets
        }
    });
});

// @desc    Get budgets needing reset
// @route   GET /api/privacy/reset-needed
// @access  Private (Admin only)
exports.getBudgetsNeedingReset = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view budgets needing reset'
        });
    }

    const budgets = await PrivacyBudget.findBudgetsNeedingReset();

    const budgetsNeedingReset = budgets.filter(budget => budget.isResetDue());

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'PrivacyBudget',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            action: 'view_budgets_needing_reset',
            budgetsFound: budgetsNeedingReset.length
        }
    });

    res.status(200).json({
        success: true,
        data: budgetsNeedingReset
    });
});

// @desc    Auto-reset budgets (cron job endpoint)
// @route   POST /api/privacy/auto-reset
// @access  Private (Admin only)
exports.autoResetBudgets = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to perform auto-reset'
        });
    }

    const budgets = await PrivacyBudget.findBudgetsNeedingReset();
    const budgetsToReset = budgets.filter(budget => budget.isResetDue());

    let resetCount = 0;
    const resetResults = [];

    for (const budget of budgetsToReset) {
        try {
            const originalConsumed = budget.consumedBudget;
            budget.resetBudget();
            await budget.save();
            
            resetCount++;
            resetResults.push({
                budgetId: budget._id,
                user: budget.user.email,
                patient: budget.patient.patientId,
                previouslyConsumed: originalConsumed,
                status: 'success'
            });

            // Log each reset
            await AuditLog.createLog({
                user: currentUser.id,
                action: 'update',
                resourceType: 'PrivacyBudget',
                resourceId: budget._id.toString(),
                ipAddress: getClientIP(req),
                userAgent: req.headers['user-agent'],
                details: {
                    action: 'auto_reset_privacy_budget',
                    budgetUser: budget.user.email,
                    patient: budget.patient.patientId,
                    previouslyConsumed: originalConsumed,
                    resetBy: 'auto_reset_job'
                }
            });

        } catch (error) {
            resetResults.push({
                budgetId: budget._id,
                user: budget.user.email,
                patient: budget.patient.patientId,
                status: 'failed',
                error: error.message
            });
        }
    }

    res.status(200).json({
        success: true,
        message: `Auto-reset completed. ${resetCount} budgets reset.`,
        data: {
            totalProcessed: budgetsToReset.length,
            successfulResets: resetCount,
            results: resetResults
        }
    });
});