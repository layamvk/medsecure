// Export all models for easy importing
const User = require('./User');
const Patient = require('./Patient');
const AuditLog = require('./AuditLog');
const PrivacyBudget = require('./PrivacyBudget');
const { SecurityEvent, DeviceTrustScore, GlobalThreatScore } = require('./SecurityEvent');
const Query = require('./Query');
const Appointment = require('./Appointment');

module.exports = {
    Query,
    User,
    Patient,
    AuditLog,
    PrivacyBudget,
    SecurityEvent,
    DeviceTrustScore,
    GlobalThreatScore,
    Appointment
};