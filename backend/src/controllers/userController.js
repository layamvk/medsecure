const { User, AuditLog, SecurityEvent } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Helper function to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin/Doctor)
exports.getUsers = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, search, role, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const currentUser = req.user;

    // Build query based on user role
    let query = {};
    
    if (currentUser.role === 'admin') {
        // Admin can see all users
        if (role && role !== 'all') {
            query.role = role;
        }
    } else if (currentUser.role === 'doctor') {
        // Doctor can only see patients and other doctors
        query.role = { $in: ['patient', 'doctor'] };
    } else {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view users'
        });
    }

    // Add search functionality
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { username: { $regex: search, $options: 'i' } }
        ];
    }

    // Only show active users by default
    query.isActive = true;

    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const users = await User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .sort(sort)
        .skip(parseInt(skip))
        .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(query);

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'User',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { 
            search,
            role,
            totalResults: total,
            page,
            limit
        }
    });

    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
        }
    });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const requestedUserId = req.params.id;

    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.id !== requestedUserId) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view this user'
        });
    }

    const user = await User.findById(requestedUserId).select('-password');

    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { viewedUser: user.email }
    });

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin only)
exports.createUser = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    // Only admin can create users
    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to create users'
        });
    }

    const { email, username, password, firstName, lastName, role, phoneNumber } = req.body;

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
        role,
        phoneNumber
    });

    // Remove password from response
    user.password = undefined;

    // Log the creation
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'create',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            createdUser: user.email,
            role: user.role,
            createdBy: currentUser.email
        }
    });

    logger.info(`User created: ${user.email} by ${currentUser.email}`);

    res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
    });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const targetUserId = req.params.id;
    
    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.id !== targetUserId) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to update this user'
        });
    }

    // Get current user data for comparison
    const currentUserData = await User.findById(targetUserId).select('-password');
    
    if (!currentUserData) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }

    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'email'];
    
    // Admin can update additional fields
    if (currentUser.role === 'admin') {
        allowedFields.push('role', 'isActive', 'isVerified', 'isMfaEnabled');
    }

    // Filter fields that can be updated
    const updateData = {};
    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    // Check for role change - only admin can change roles
    if (updateData.role && currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to change user role'
        });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
        targetUserId,
        updateData,
        {
            new: true,
            runValidators: true
        }
    ).select('-password');

    // Track what changed
    const changes = {};
    Object.keys(updateData).forEach(key => {
        if (currentUserData[key] !== updateData[key]) {
            changes[key] = {
                from: currentUserData[key],
                to: updateData[key]
            };
        }
    });

    // Log the update
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'update',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            updatedUser: user.email,
            changes,
            updatedBy: currentUser.email
        },
        dataChanged: {
            before: currentUserData,
            after: user
        }
    });

    // Log role changes as security events
    if (changes.role) {
        await SecurityEvent.create({
            user: currentUser._id,
            eventType: 'privilege_escalation',
            severity: 'high',
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            description: `User role changed from ${changes.role.from} to ${changes.role.to}`,
            details: {
                targetUser: user.email,
                roleChange: changes.role,
                changedBy: currentUser.email
            }
        });
    }

    logger.info(`User updated: ${user.email} by ${currentUser.email}`);

    res.status(200).json({
        success: true,
        data: user,
        message: 'User updated successfully'
    });
});

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const targetUserId = req.params.id;

    // Only admin can delete users
    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to delete users'
        });
    }

    // Can't delete yourself
    if (currentUser.id === targetUserId) {
        return res.status(400).json({
            success: false,
            error: 'Cannot delete your own account'
        });
    }

    const user = await User.findById(targetUserId);

    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }

    // Soft delete by setting isActive to false
    user.isActive = false;
    await user.save();

    // Log the deletion
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'delete',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            deletedUser: user.email,
            deletedBy: currentUser.email,
            softDelete: true
        }
    });

    // Create security event
    await SecurityEvent.create({
        user: currentUser._id,
        eventType: 'data_tampering',
        severity: 'high',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        description: `User account deactivated: ${user.email}`,
        details: {
            targetUser: user.email,
            action: 'soft_delete',
            deletedBy: currentUser.email
        }
    });

    logger.info(`User deactivated: ${user.email} by ${currentUser.email}`);

    res.status(200).json({
        success: true,
        message: 'User deactivated successfully'
    });
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const allowedFields = ['firstName', 'lastName', 'phoneNumber'];

    // Filter fields that can be updated
    const updateData = {};
    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    // Get current user data for comparison
    const currentUserData = await User.findById(currentUser.id).select('-password');

    // Update user
    const user = await User.findByIdAndUpdate(
        currentUser.id,
        updateData,
        {
            new: true,
            runValidators: true
        }
    ).select('-password');

    // Track what changed
    const changes = {};
    Object.keys(updateData).forEach(key => {
        if (currentUserData[key] !== updateData[key]) {
            changes[key] = {
                from: currentUserData[key],
                to: updateData[key]
            };
        }
    });

    // Log the update
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'update',
        resourceType: 'User',
        resourceId: user._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            profileUpdate: true,
            changes
        }
    });

    res.status(200).json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
    });
});

// @desc    Get user statistics (admin only)
// @route   GET /api/users/stats
// @access  Private (Admin only)
exports.getUserStats = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view user statistics'
        });
    }

    const stats = await User.aggregate([
        {
            $match: { isActive: true }
        },
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    const totalUsers = await User.countDocuments({ isActive: true });
    const recentUsers = await User.countDocuments({
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'User',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { action: 'view_statistics' }
    });

    res.status(200).json({
        success: true,
        data: {
            roleDistribution: stats,
            totalUsers,
            recentUsers
        }
    });
});