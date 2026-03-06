const express = require('express');
const {
    getSecurityEvents,
    getSecurityEvent,
    createSecurityEvent,
    resolveSecurityEvent,
    getSecuritySummary,
    getDeviceTrustScores,
    updateDeviceTrustScore,
    getGlobalThreatScore,
    updateGlobalThreatScore,
    getSecurityStats
} = require('../controllers/securityController');
const { protect, adminOnly, adminOrDoctor } = require('../middleware/auth');
const { validateRequest, securityValidations, commonValidations } = require('../middleware/validation');

const router = express.Router();

// All routes are protected
router.use(protect);

// Security summary/dashboard (admin only)
router.get('/summary', adminOnly, getSecuritySummary);

// Security statistics (admin only)
router.get('/stats', adminOnly, getSecurityStats);

// Device trust scores
router.route('/devices')
    .get(getDeviceTrustScores);

router.route('/devices/:deviceId')
    .put(securityValidations.updateDeviceTrust, validateRequest, adminOnly, updateDeviceTrustScore);

// Global threat score
router.route('/threat-level')
    .get(adminOnly, getGlobalThreatScore)
    .put(securityValidations.updateThreatScore, validateRequest, adminOnly, updateGlobalThreatScore);

// Security event resolution
router.put('/events/:id/resolve', [
    commonValidations.mongoId,
    ...securityValidations.resolveEvent
], validateRequest, adminOnly, resolveSecurityEvent);

// Security events CRUD
router.route('/events')
    .get(securityValidations.query, validateRequest, adminOrDoctor, getSecurityEvents)
    .post(securityValidations.createEvent, validateRequest, adminOnly, createSecurityEvent);

router.route('/events/:id')
    .get(commonValidations.mongoId, validateRequest, adminOrDoctor, getSecurityEvent);

module.exports = router;