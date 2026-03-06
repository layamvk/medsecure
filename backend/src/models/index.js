// Export all models for easy importing
const User = require('./User');
const Patient = require('./Patient');
const AuditLog = require('./AuditLog');
const PrivacyBudget = require('./PrivacyBudget');
const { SecurityEvent, DeviceTrustScore, GlobalThreatScore } = require('./SecurityEvent');

module.exports = {
    User,
    Patient,
    AuditLog,
    PrivacyBudget,
    SecurityEvent,
    DeviceTrustScore,
    GlobalThreatScore
};