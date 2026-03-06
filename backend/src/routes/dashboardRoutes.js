const express = require('express');
const { protect } = require('../middleware/auth');
const { Query, AuditLog, Patient, User } = require('../models');
const Appointment = require('../models/Appointment');

const router = express.Router();

router.use(protect);

// GET /api/dashboard/stats — Dynamic dashboard metrics
router.get('/stats', async (req, res) => {
    try {
        let totalPatients = 0;
        let activeQueries = 0;
        let pendingReview = 0;
        let urgentAlerts = 0;
        let totalAppointments = 0;

        if (!global.useMockDB) {
            const [patientCount, queries, appointmentCount] = await Promise.all([
                Patient.countDocuments({ isDeleted: { $ne: true } }).catch(() => 0),
                Query.find().lean().catch(() => []),
                Appointment.countDocuments({ status: { $in: ['scheduled', 'confirmed'] } }).catch(() => 0)
            ]);

            totalPatients = patientCount || 0;
            activeQueries = queries.filter(q => q.status !== 'closed').length;
            pendingReview = queries.filter(q => q.status === 'open' || q.status === 'triaged').length;
            urgentAlerts = queries.filter(q => q.priority === 'critical' || q.priority === 'urgent').length;
            totalAppointments = appointmentCount || 0;
        } else {
            // Demo data for mock mode
            totalPatients = 247;
            activeQueries = 18;
            pendingReview = 5;
            urgentAlerts = 2;
            totalAppointments = 34;
        }

        res.json({
            success: true,
            stats: {
                totalPatients,
                activeQueries,
                pendingReview,
                urgentAlerts,
                totalAppointments
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// GET /api/dashboard/activity — Real-time activity feed from audit logs
router.get('/activity', async (req, res) => {
    try {
        let activities = [];

        if (!global.useMockDB) {
            const logs = await AuditLog.find({
                action: {
                    $in: [
                        'create', 'AI_RESPONSE_SENT', 'AI_APPROVED',
                        'update', 'login', 'logout', 'read'
                    ]
                }
            })
                .populate('user', 'firstName lastName role username')
                .sort({ createdAt: -1 })
                .limit(20)
                .lean()
                .catch(() => []);

            activities = logs.map(log => {
                const userName = log.user
                    ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.username || 'Unknown'
                    : 'System';

                let type = 'general';
                let message = '';
                let urgent = false;

                const detailType = log.details?.type || '';

                if (detailType === 'QUERY_CREATED' || log.action === 'create' && log.resourceType === 'Query') {
                    type = 'query';
                    message = `New patient query submitted by ${userName}`;
                    urgent = log.details?.ml?.urgency === 'critical';
                } else if (detailType === 'AI_SUGGESTION_GENERATED') {
                    type = 'ai';
                    message = `AI draft generated for query`;
                } else if (detailType === 'AI_RESPONSE_SENT' || log.action === 'AI_RESPONSE_SENT') {
                    type = 'response';
                    message = `${userName} sent a response to patient`;
                } else if (detailType === 'AI_APPROVED' || log.action === 'AI_APPROVED') {
                    type = 'ai';
                    message = `${userName} approved AI response`;
                } else if (detailType === 'APPOINTMENT_BOOKED') {
                    type = 'appointment';
                    message = `${userName} booked an appointment`;
                } else if (log.action === 'login') {
                    type = 'auth';
                    message = `${userName} logged in`;
                } else if (detailType === 'QUERY_TRIAGED') {
                    type = 'query';
                    message = `Query triaged by ${userName}`;
                } else if (detailType === 'QUERY_ASSIGNED') {
                    type = 'query';
                    message = `Query assigned by ${userName}`;
                } else {
                    type = 'general';
                    message = `${log.action} ${log.resourceType || ''} by ${userName}`;
                }

                return {
                    id: log._id,
                    type,
                    message,
                    urgent,
                    time: log.createdAt,
                    userName,
                    role: log.user?.role || 'system'
                };
            });
        } else {
            // Demo activity data for mock mode
            const now = Date.now();
            activities = [
                { id: 'a1', type: 'query',       message: 'New patient query submitted by John Doe',       urgent: false, time: new Date(now - 2  * 60000).toISOString(), userName: 'John Doe',      role: 'patient' },
                { id: 'a2', type: 'ai',           message: 'AI draft generated for query',                  urgent: false, time: new Date(now - 5  * 60000).toISOString(), userName: 'System',        role: 'system' },
                { id: 'a3', type: 'response',     message: 'Dr. Sarah Chen sent a response to patient',     urgent: false, time: new Date(now - 8  * 60000).toISOString(), userName: 'Dr. Sarah Chen',role: 'doctor' },
                { id: 'a4', type: 'query',        message: 'New patient query — chest pain',                 urgent: true,  time: new Date(now - 12 * 60000).toISOString(), userName: 'Emily Johnson', role: 'patient' },
                { id: 'a5', type: 'appointment',  message: 'Maria Garcia booked an appointment',            urgent: false, time: new Date(now - 20 * 60000).toISOString(), userName: 'Maria Garcia',  role: 'receptionist' },
                { id: 'a6', type: 'auth',         message: 'Admin User logged in',                          urgent: false, time: new Date(now - 35 * 60000).toISOString(), userName: 'Admin User',    role: 'admin' },
                { id: 'a7', type: 'ai',           message: 'Dr. Sarah Chen approved AI response',           urgent: false, time: new Date(now - 45 * 60000).toISOString(), userName: 'Dr. Sarah Chen',role: 'doctor' },
                { id: 'a8', type: 'query',        message: 'Query triaged by Emily Johnson',                urgent: false, time: new Date(now - 60 * 60000).toISOString(), userName: 'Emily Johnson', role: 'nurse' },
            ];
        }

        res.json({ success: true, activities });
    } catch (error) {
        console.error('Activity feed error:', error);
        res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
});

module.exports = router;
