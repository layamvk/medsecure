const express = require('express');
const {
    getAuditLogs,
    getAuditLog,
    getUserActivitySummary,
    getSystemActivity,
    getAuditStats,
    exportAuditLogs
} = require('../controllers/auditController');
const { protect, adminOnly, adminOrDoctor } = require('../middleware/auth');
const { validateRequest, auditValidations, commonValidations } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Export audit logs (admin only)
router.get('/export', auditValidations.export, validateRequest, adminOnly, exportAuditLogs);

// System activity (admin only)
router.get('/activity', adminOnly, getSystemActivity);

// Audit statistics (admin only)
router.get('/stats', adminOnly, getAuditStats);

// User activity summary (admin only)
router.get('/user/:userId/summary', [
    commonValidations.mongoId.replace('id', 'userId'),
    ...commonValidations.pagination
], validateRequest, adminOnly, getUserActivitySummary);

// Audit logs
router.route('/')
    .get(auditValidations.query, validateRequest, adminOrDoctor, getAuditLogs);

router.route('/:id')
    .get(commonValidations.mongoId, validateRequest, adminOrDoctor, getAuditLog);

module.exports = router;