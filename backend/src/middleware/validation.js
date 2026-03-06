const { validationResult } = require('express-validator');
const { body, query, param } = require('express-validator');

// Validation error handler
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const extractedErrors = [];
        errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: extractedErrors
        });
    }

    next();
};

// Common validation rules
const commonValidations = {
    // ID validation
    mongoId: param('id').isMongoId().withMessage('Invalid ID format'),
    
    // Pagination
    pagination: [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('sortBy').optional().isAlpha().withMessage('Sort field must contain only letters'),
        query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
    ],
    
    // Date range
    dateRange: [
        query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO8601 date'),
        query('endDate').optional().isISO8601().withMessage('End date must be valid ISO8601 date')
    ],
    
    // Search
    search: query('search').optional().isLength({ min: 2, max: 100 }).trim().withMessage('Search term must be 2-100 characters')
};

// User validation rules
const userValidations = {
    create: [
        body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
        body('username').isLength({ min: 3, max: 50 }).trim().withMessage('Username must be 3-50 characters'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain uppercase, lowercase, number and special character'),
        body('firstName').optional().isLength({ max: 100 }).trim().withMessage('First name cannot exceed 100 characters'),
        body('lastName').optional().isLength({ max: 100 }).trim().withMessage('Last name cannot exceed 100 characters'),
        body('role').optional().isIn(['admin', 'doctor', 'nurse', 'receptionist', 'patient', 'staff'])
            .withMessage('Invalid role'),
        body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number')
    ],
    
    update: [
        body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
        body('firstName').optional().isLength({ max: 100 }).trim().withMessage('First name cannot exceed 100 characters'),
        body('lastName').optional().isLength({ max: 100 }).trim().withMessage('Last name cannot exceed 100 characters'),
        body('role').optional().isIn(['admin', 'doctor', 'nurse', 'receptionist', 'patient', 'staff'])
            .withMessage('Invalid role'),
        body('phoneNumber').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
        body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
        body('isVerified').optional().isBoolean().withMessage('isVerified must be boolean'),
        body('isMfaEnabled').optional().isBoolean().withMessage('isMfaEnabled must be boolean')
    ],
    
    query: [
        ...commonValidations.pagination,
        query('role').optional().isIn(['admin', 'doctor', 'nurse', 'receptionist', 'patient', 'staff', 'all'])
            .withMessage('Invalid role filter'),
        commonValidations.search
    ]
};

// Patient validation rules
const patientValidations = {
    create: [
        body('firstName').notEmpty().isLength({ max: 100 }).trim().withMessage('First name is required and cannot exceed 100 characters'),
        body('lastName').notEmpty().isLength({ max: 100 }).trim().withMessage('Last name is required and cannot exceed 100 characters'),
        body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required')
            .custom((value) => {
                if (new Date(value) > new Date()) {
                    throw new Error('Date of birth cannot be in the future');
                }
                return true;
            }),
        body('gender').isIn(['male', 'female', 'other', 'prefer-not-to-say']).withMessage('Invalid gender'),
        body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
        body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
        body('address.street').optional().isLength({ max: 200 }).trim(),
        body('address.city').optional().isLength({ max: 100 }).trim(),
        body('address.state').optional().isLength({ max: 50 }).trim(),
        body('address.zipCode').optional().isPostalCode('any').withMessage('Invalid postal code'),
        body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood type'),
        body('sensitivityLevel').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid sensitivity level'),
        body('assignedDoctor').optional().isMongoId().withMessage('Invalid doctor ID'),
        body('emergencyContact.name').notEmpty().withMessage('Emergency contact name is required'),
        body('emergencyContact.phoneNumber').isMobilePhone().withMessage('Valid emergency contact phone is required')
    ],
    
    update: [
        body('firstName').optional().isLength({ min: 1, max: 100 }).trim().withMessage('First name cannot exceed 100 characters'),
        body('lastName').optional().isLength({ min: 1, max: 100 }).trim().withMessage('Last name cannot exceed 100 characters'),
        body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required')
            .custom((value) => {
                if (new Date(value) > new Date()) {
                    throw new Error('Date of birth cannot be in the future');
                }
                return true;
            }),
        body('gender').optional().isIn(['male', 'female', 'other', 'prefer-not-to-say']).withMessage('Invalid gender'),
        body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number is required'),
        body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
        body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood type'),
        body('sensitivityLevel').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid sensitivity level'),
        body('assignedDoctor').optional().isMongoId().withMessage('Invalid doctor ID')
    ],
    
    query: [
        ...commonValidations.pagination,
        query('assignedDoctor').optional().isMongoId().withMessage('Invalid doctor ID'),
        query('sensitivityLevel').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid sensitivity level'),
        commonValidations.search
    ]
};

// Audit validation rules
const auditValidations = {
    query: [
        ...commonValidations.pagination,
        ...commonValidations.dateRange,
        query('userId').optional().isMongoId().withMessage('Invalid user ID'),
        query('action').optional().isIn([
            'create', 'read', 'update', 'delete', 
            'login', 'logout', 'failed_login',
            'export', 'access_denied', 'password_change',
            'role_change', 'privacy_access'
        ]).withMessage('Invalid action'),
        query('resourceType').optional().isIn(['User', 'Patient', 'AuditLog', 'SecurityEvent', 'PrivacyBudget'])
            .withMessage('Invalid resource type'),
        query('success').optional().isBoolean().withMessage('Success must be boolean')
    ],
    
    export: [
        query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
        ...commonValidations.dateRange,
        query('userId').optional().isMongoId().withMessage('Invalid user ID'),
        query('action').optional().isAlpha().withMessage('Action must contain only letters')
    ]
};

// Security validation rules
const securityValidations = {
    createEvent: [
        body('eventType').isIn([
            'failed_login', 'suspicious_access', 'data_breach_attempt',
            'unauthorized_export', 'session_hijack', 'brute_force',
            'privilege_escalation', 'data_tampering', 'malicious_query',
            'unusual_access_pattern', 'geo_anomaly', 'device_anomaly'
        ]).withMessage('Invalid event type'),
        body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
        body('description').notEmpty().isLength({ max: 1000 }).withMessage('Description is required and cannot exceed 1000 characters'),
        body('user').optional().isMongoId().withMessage('Invalid user ID'),
        body('ipAddress').optional().isIP().withMessage('Invalid IP address')
    ],
    
    resolveEvent: [
        body('resolution').notEmpty().isLength({ max: 1000 }).withMessage('Resolution is required and cannot exceed 1000 characters'),
        body('falsePositive').optional().isBoolean().withMessage('falsePositive must be boolean')
    ],
    
    updateDeviceTrust: [
        body('trustScore').isInt({ min: 0, max: 100 }).withMessage('Trust score must be between 0 and 100'),
        body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
    ],
    
    updateThreatScore: [
        body('score').isInt({ min: 0, max: 100 }).withMessage('Threat score must be between 0 and 100'),
        body('factors').optional().isObject().withMessage('Factors must be an object')
    ],
    
    query: [
        ...commonValidations.pagination,
        ...commonValidations.dateRange,
        query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
        query('eventType').optional().isAlpha().withMessage('Event type must contain only letters'),
        query('resolved').optional().isBoolean().withMessage('Resolved must be boolean')
    ]
};

// Privacy budget validation rules
const privacyValidations = {
    create: [
        body('user').isMongoId().withMessage('Valid user ID is required'),
        body('patient').isMongoId().withMessage('Valid patient ID is required'),
        body('totalBudget').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Total budget must be between 0.1 and 100'),
        body('epsilon').optional().isFloat({ min: 0.01, max: 10 }).withMessage('Epsilon must be between 0.01 and 10'),
        body('delta').optional().isFloat({ min: 0.00001, max: 1 }).withMessage('Delta must be between 0.00001 and 1'),
        body('resetPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'yearly', 'never']).withMessage('Invalid reset period'),
        body('autoReset').optional().isBoolean().withMessage('autoReset must be boolean')
    ],
    
    update: [
        body('totalBudget').optional().isFloat({ min: 0.1, max: 100 }).withMessage('Total budget must be between 0.1 and 100'),
        body('epsilon').optional().isFloat({ min: 0.01, max: 10 }).withMessage('Epsilon must be between 0.01 and 10'),
        body('delta').optional().isFloat({ min: 0.00001, max: 1 }).withMessage('Delta must be between 0.00001 and 1'),
        body('resetPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'yearly', 'never']).withMessage('Invalid reset period'),
        body('autoReset').optional().isBoolean().withMessage('autoReset must be boolean'),
        body('status').optional().isIn(['active', 'exhausted', 'suspended', 'reset_pending']).withMessage('Invalid status'),
        body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
    ],
    
    consume: [
        body('epsilon').isFloat({ min: 0.001, max: 5 }).withMessage('Epsilon must be between 0.001 and 5'),
        body('queryType').optional().isIn(['read', 'aggregate', 'export', 'analysis']).withMessage('Invalid query type'),
        body('description').optional().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters')
    ],
    
    query: [
        ...commonValidations.pagination,
        query('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
        query('status').optional().isIn(['active', 'exhausted', 'suspended', 'reset_pending']).withMessage('Invalid status')
    ]
};

module.exports = {
    validateRequest,
    commonValidations,
    userValidations,
    patientValidations,
    auditValidations,
    securityValidations,
    privacyValidations
};