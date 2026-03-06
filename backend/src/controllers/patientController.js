const { Patient, User, AuditLog, PrivacyBudget, SecurityEvent } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

// Helper function to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// Helper function to check patient access permissions
const checkPatientAccess = async (user, patient, action = 'read') => {
    if (user.role === 'admin') return true;
    if (user.role === 'doctor' && patient.assignedDoctor?.toString() === user.id) return true;
    if (user.role === 'patient' && patient._id.toString() === user.id) return action === 'read';
    if (user.role === 'nurse') return action === 'read'; // Nurses can read but not modify
    if (user.role === 'receptionist') return action === 'read'; // Receptionists can read but not modify
    return false;
};

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
exports.getPatients = asyncHandler(async (req, res, next) => {
    const { 
        page = 1, 
        limit = 10, 
        search, 
        assignedDoctor,
        sensitivityLevel,
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
    } = req.query;
    
    const currentUser = req.user;

    // Build query based on user role and permissions
    let query = { isActive: true };

    // Role-based filtering
    if (currentUser.role === 'admin') {
        // Admin can see all patients
    } else if (currentUser.role === 'doctor') {
        // Doctor can only see their assigned patients
        query.assignedDoctor = currentUser.id;
    } else if (currentUser.role === 'patient') {
        // Patients can only see their own records
        query._id = currentUser.id;
    } else if (['nurse', 'receptionist'].includes(currentUser.role)) {
        // Nurses and receptionists can see patients but with limited info
    } else {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view patients'
        });
    }

    // Additional filters
    if (assignedDoctor && currentUser.role === 'admin') {
        query.assignedDoctor = assignedDoctor;
    }

    if (sensitivityLevel) {
        // Only admin and assigned doctors can filter by sensitivity
        if (['admin', 'doctor'].includes(currentUser.role)) {
            query.sensitivityLevel = sensitivityLevel;
        }
    }

    // Search functionality
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { patientId: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } }
        ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with population
    const patients = await Patient.find(query)
        .populate('assignedDoctor', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .skip(parseInt(skip))
        .limit(parseInt(limit));

    // Filter sensitive information based on role
    let filteredPatients = patients;
    if (['nurse', 'receptionist'].includes(currentUser.role)) {
        filteredPatients = patients.map(patient => ({
            _id: patient._id,
            patientId: patient.patientId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            phoneNumber: patient.phoneNumber,
            email: patient.email,
            assignedDoctor: patient.assignedDoctor,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt
        }));
    }

    // Get total count
    const total = await Patient.countDocuments(query);

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'Patient',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { 
            search,
            assignedDoctor,
            sensitivityLevel,
            totalResults: total,
            page,
            limit
        }
    });

    res.status(200).json({
        success: true,
        data: filteredPatients,
        pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
        }
    });
});

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private
exports.getPatient = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const patientId = req.params.id;

    const patient = await Patient.findById(patientId)
        .populate('assignedDoctor', 'firstName lastName email role')
        .populate('createdBy', 'firstName lastName email role');

    if (!patient) {
        return res.status(404).json({
            success: false,
            error: 'Patient not found'
        });
    }

    // Check access permissions
    const hasAccess = await checkPatientAccess(currentUser, patient, 'read');
    
    if (!hasAccess) {
        // Log unauthorized access attempt
        await SecurityEvent.create({
            user: currentUser._id,
            eventType: 'unauthorized_access',
            severity: 'high',
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            description: `Unauthorized attempt to access patient ${patient.patientId}`,
            details: {
                patientId: patient.patientId,
                userRole: currentUser.role,
                attemptedBy: currentUser.email
            }
        });

        return res.status(403).json({
            success: false,
            error: 'Not authorized to view this patient'
        });
    }

    // Check and consume privacy budget for sensitive data access
    if (patient.sensitivityLevel === 'high' || patient.sensitivityLevel === 'critical') {
        const privacyBudget = await PrivacyBudget.findOne({
            user: currentUser._id,
            patient: patient._id
        });

        if (privacyBudget && privacyBudget.remainingBudget < 0.1) {
            return res.status(429).json({
                success: false,
                error: 'Privacy budget exhausted for this patient',
                budgetInfo: {
                    consumed: privacyBudget.consumedBudget,
                    total: privacyBudget.totalBudget,
                    remaining: privacyBudget.remainingBudget
                }
            });
        }

        // Consume privacy budget if it exists
        if (privacyBudget) {
            privacyBudget.consumeBudget(0.1, 'read', 'Patient record access');
            await privacyBudget.save();
        }
    }

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'Patient',
        resourceId: patient._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            patientId: patient.patientId,
            sensitivityLevel: patient.sensitivityLevel,
            accessedBy: currentUser.email
        }
    });

    // Update last accessed info
    patient.lastAccessedBy = currentUser._id;
    patient.lastAccessedAt = new Date();
    await patient.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        data: patient
    });
});

// @desc    Create patient
// @route   POST /api/patients
// @access  Private (Admin/Doctor/Receptionist)
exports.createPatient = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    // Check permissions
    if (!['admin', 'doctor', 'receptionist'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to create patients'
        });
    }

    const patientData = {
        ...req.body,
        createdBy: currentUser.id
    };

    // If assigning to a doctor, verify the doctor exists
    if (patientData.assignedDoctor) {
        const doctor = await User.findById(patientData.assignedDoctor);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(400).json({
                success: false,
                error: 'Invalid assigned doctor'
            });
        }
    }

    const patient = await Patient.create(patientData);

    // Populate the created patient
    await patient.populate('assignedDoctor', 'firstName lastName email');
    await patient.populate('createdBy', 'firstName lastName email');

    // Create initial privacy budget for high/critical sensitivity patients
    if (['high', 'critical'].includes(patient.sensitivityLevel)) {
        await PrivacyBudget.create({
            user: currentUser._id,
            patient: patient._id,
            totalBudget: parseFloat(process.env.DEFAULT_PRIVACY_BUDGET) || 10.0,
            epsilon: parseFloat(process.env.DEFAULT_EPSILON) || 1.0,
            delta: parseFloat(process.env.DEFAULT_DELTA) || 0.00001,
            createdBy: currentUser._id
        });

        // Create privacy budget for assigned doctor if different
        if (patient.assignedDoctor && patient.assignedDoctor._id.toString() !== currentUser.id) {
            await PrivacyBudget.create({
                user: patient.assignedDoctor._id,
                patient: patient._id,
                totalBudget: parseFloat(process.env.DEFAULT_PRIVACY_BUDGET) || 10.0,
                epsilon: parseFloat(process.env.DEFAULT_EPSILON) || 1.0,
                delta: parseFloat(process.env.DEFAULT_DELTA) || 0.00001,
                createdBy: currentUser._id
            });
        }
    }

    // Log the creation
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'create',
        resourceType: 'Patient',
        resourceId: patient._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            patientId: patient.patientId,
            createdBy: currentUser.email,
            assignedDoctor: patient.assignedDoctor?.email,
            sensitivityLevel: patient.sensitivityLevel
        }
    });

    logger.info(`Patient created: ${patient.patientId} by ${currentUser.email}`);

    res.status(201).json({
        success: true,
        data: patient,
        message: 'Patient created successfully'
    });
});

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private
exports.updatePatient = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const patientId = req.params.id;

    const patient = await Patient.findById(patientId);

    if (!patient) {
        return res.status(404).json({
            success: false,
            error: 'Patient not found'
        });
    }

    // Check access permissions
    const hasAccess = await checkPatientAccess(currentUser, patient, 'update');
    
    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to update this patient'
        });
    }

    // Store original data for audit log
    const originalData = patient.toObject();

    // Filter allowed fields based on role
    let allowedFields = [
        'firstName', 'lastName', 'dateOfBirth', 'gender', 'phoneNumber', 'email', 'address',
        'bloodType', 'allergies', 'medicalConditions', 'medications', 'emergencyContact'
    ];

    if (['admin', 'doctor'].includes(currentUser.role)) {
        allowedFields.push('sensitivityLevel', 'assignedDoctor');
    }

    // Filter update data
    const updateData = {};
    Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    // Validate assigned doctor if provided
    if (updateData.assignedDoctor) {
        const doctor = await User.findById(updateData.assignedDoctor);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(400).json({
                success: false,
                error: 'Invalid assigned doctor'
            });
        }
    }

    // Update patient
    const updatedPatient = await Patient.findByIdAndUpdate(
        patientId,
        updateData,
        {
            new: true,
            runValidators: true
        }
    ).populate('assignedDoctor', 'firstName lastName email')
     .populate('createdBy', 'firstName lastName email');

    // Track changes
    const changes = {};
    Object.keys(updateData).forEach(key => {
        if (JSON.stringify(originalData[key]) !== JSON.stringify(updateData[key])) {
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
        resourceType: 'Patient',
        resourceId: patient._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            patientId: patient.patientId,
            changes,
            updatedBy: currentUser.email
        },
        dataChanged: {
            before: originalData,
            after: updatedPatient
        }
    });

    // Log sensitivity level changes as security events
    if (changes.sensitivityLevel) {
        await SecurityEvent.create({
            user: currentUser._id,
            eventType: 'data_tampering',
            severity: 'medium',
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'],
            description: `Patient sensitivity level changed from ${changes.sensitivityLevel.from} to ${changes.sensitivityLevel.to}`,
            details: {
                patientId: patient.patientId,
                sensitivityChange: changes.sensitivityLevel,
                changedBy: currentUser.email
            }
        });
    }

    logger.info(`Patient updated: ${patient.patientId} by ${currentUser.email}`);

    res.status(200).json({
        success: true,
        data: updatedPatient,
        message: 'Patient updated successfully'
    });
});

// @desc    Delete patient (soft delete)
// @route   DELETE /api/patients/:id
// @access  Private (Admin only)
exports.deletePatient = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;
    const patientId = req.params.id;

    // Only admin can delete patients
    if (currentUser.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to delete patients'
        });
    }

    const patient = await Patient.findById(patientId);

    if (!patient) {
        return res.status(404).json({
            success: false,
            error: 'Patient not found'
        });
    }

    // Soft delete
    patient.isActive = false;
    await patient.save();

    // Log the deletion
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'delete',
        resourceType: 'Patient',
        resourceId: patient._id.toString(),
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
            patientId: patient.patientId,
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
        description: `Patient record deactivated: ${patient.patientId}`,
        details: {
            patientId: patient.patientId,
            action: 'soft_delete',
            deletedBy: currentUser.email
        }
    });

    logger.info(`Patient deactivated: ${patient.patientId} by ${currentUser.email}`);

    res.status(200).json({
        success: true,
        message: 'Patient deactivated successfully'
    });
});

// @desc    Get patients assigned to current doctor
// @route   GET /api/patients/my-patients
// @access  Private (Doctor only)
exports.getMyPatients = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (currentUser.role !== 'doctor') {
        return res.status(403).json({
            success: false,
            error: 'Only doctors can view their assigned patients'
        });
    }

    const { page = 1, limit = 10, sensitivityLevel, sortBy = 'lastName', sortOrder = 'asc' } = req.query;

    let query = {
        assignedDoctor: currentUser.id,
        isActive: true
    };

    if (sensitivityLevel) {
        query.sensitivityLevel = sensitivityLevel;
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const patients = await Patient.find(query)
        .sort(sort)
        .skip(parseInt(skip))
        .limit(parseInt(limit));

    const total = await Patient.countDocuments(query);

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'Patient',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { 
            action: 'view_assigned_patients',
            totalResults: total,
            page,
            limit
        }
    });

    res.status(200).json({
        success: true,
        data: patients,
        pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
        }
    });
});

// @desc    Get patient statistics
// @route   GET /api/patients/stats
// @access  Private (Admin/Doctor)
exports.getPatientStats = asyncHandler(async (req, res, next) => {
    const currentUser = req.user;

    if (!['admin', 'doctor'].includes(currentUser.role)) {
        return res.status(403).json({
            success: false,
            error: 'Not authorized to view patient statistics'
        });
    }

    let matchQuery = { isActive: true };
    
    // Doctors can only see stats for their patients
    if (currentUser.role === 'doctor') {
        matchQuery.assignedDoctor = currentUser._id;
    }

    const stats = await Patient.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalPatients: { $sum: 1 },
                bySensitivity: {
                    $push: {
                        level: '$sensitivityLevel'
                    }
                },
                byGender: {
                    $push: {
                        gender: '$gender'
                    }
                },
                averageAge: {
                    $avg: {
                        $divide: [
                            { $subtract: [new Date(), '$dateOfBirth'] },
                            365.25 * 24 * 60 * 60 * 1000
                        ]
                    }
                }
            }
        }
    ]);

    const sensitivityStats = await Patient.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$sensitivityLevel',
                count: { $sum: 1 }
            }
        }
    ]);

    const recentPatients = await Patient.countDocuments({
        ...matchQuery,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    // Log the access
    await AuditLog.createLog({
        user: currentUser.id,
        action: 'read',
        resourceType: 'Patient',
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { action: 'view_statistics' }
    });

    res.status(200).json({
        success: true,
        data: {
            totalPatients: stats[0]?.totalPatients || 0,
            sensitivityDistribution: sensitivityStats,
            recentPatients,
            averageAge: stats[0]?.averageAge ? Math.round(stats[0].averageAge) : 0
        }
    });
});