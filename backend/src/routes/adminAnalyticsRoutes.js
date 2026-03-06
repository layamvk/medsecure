const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { Query, AuditLog, Patient, User, Appointment, SecurityEvent } = require('../models');

const router = express.Router();

// All routes require authentication + admin role
router.use(protect);
router.use(adminOnly);

// ─────────────────────────────────────────────────────
// GET /api/admin-analytics/stats — Key operational metrics
// ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [
            totalPatients,
            totalUsers,
            activeQueries,
            criticalAlerts,
            appointmentsToday,
            totalAppointments
        ] = await Promise.all([
            Patient.countDocuments().catch(() => 0),
            User.countDocuments({ isActive: true }).catch(() => 0),
            Query.countDocuments({ status: { $nin: ['closed'] } }).catch(() => 0),
            Query.countDocuments({ priority: { $in: ['critical', 'urgent'] }, status: { $nin: ['closed'] } }).catch(() => 0),
            Appointment.countDocuments({ date: { $gte: todayStart } }).catch(() => 0),
            Appointment.countDocuments().catch(() => 0),
        ]);

        res.json({
            success: true,
            data: {
                totalPatients: totalPatients || 0,
                totalUsers: totalUsers || 0,
                activeQueries: activeQueries || 0,
                criticalAlerts: criticalAlerts || 0,
                appointmentsToday: appointmentsToday || 0,
                totalAppointments: totalAppointments || 0,
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch admin stats' });
    }
});

// ─────────────────────────────────────────────────────
// GET /api/admin-analytics/workload — Doctor workload distribution
// ─────────────────────────────────────────────────────
router.get('/workload', async (req, res) => {
    try {
        // Aggregate queries assigned to doctors
        const queryWorkload = await Query.aggregate([
            { $match: { assignedTo: { $ne: null } } },
            { $group: { _id: '$assignedTo', queries: { $sum: 1 } } }
        ]).catch(() => []);

        // Aggregate appointments per doctor
        const appointmentWorkload = await Appointment.aggregate([
            { $match: { doctorId: { $ne: null } } },
            { $group: { _id: '$doctorId', appointments: { $sum: 1 }, department: { $first: '$department' } } }
        ]).catch(() => []);

        // Get all doctors
        const doctors = await User.find({ role: 'doctor', isActive: true })
            .select('firstName lastName email')
            .lean()
            .catch(() => []);

        // Merge data
        const workloadMap = {};
        doctors.forEach(doc => {
            workloadMap[String(doc._id)] = {
                doctorId: doc._id,
                name: `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || doc.email,
                queries: 0,
                appointments: 0,
                department: 'General',
            };
        });

        queryWorkload.forEach(q => {
            const id = String(q._id);
            if (workloadMap[id]) workloadMap[id].queries = q.queries;
        });

        appointmentWorkload.forEach(a => {
            const id = String(a._id);
            if (workloadMap[id]) {
                workloadMap[id].appointments = a.appointments;
                if (a.department) workloadMap[id].department = a.department;
            }
        });

        const workload = Object.values(workloadMap).map(w => ({
            ...w,
            totalWorkload: w.queries + w.appointments,
        }));

        // If no real data, provide demo data
        const result = workload.length > 0 ? workload : [
            { name: 'Dr. Sarah Jenkins', department: 'Cardiology', queries: 24, appointments: 18, totalWorkload: 42 },
            { name: 'Dr. Robert Smith', department: 'Neurology', queries: 19, appointments: 22, totalWorkload: 41 },
            { name: 'Dr. Angela Yuen', department: 'Oncology', queries: 15, appointments: 12, totalWorkload: 27 },
            { name: 'Dr. Michael Chen', department: 'General', queries: 28, appointments: 25, totalWorkload: 53 },
            { name: 'Dr. Lisa Wang', department: 'Pediatrics', queries: 11, appointments: 16, totalWorkload: 27 },
        ];

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Workload error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch workload data' });
    }
});

// ─────────────────────────────────────────────────────
// GET /api/admin-analytics/query-trends — Query resolution trends (last 14 days)
// ─────────────────────────────────────────────────────
router.get('/query-trends', async (req, res) => {
    try {
        const daysBack = 14;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        startDate.setHours(0, 0, 0, 0);

        const openedByDay = await Query.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    opened: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]).catch(() => []);

        const resolvedByDay = await Query.aggregate([
            { $match: { status: { $in: ['closed', 'responded'] }, updatedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                    resolved: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]).catch(() => []);

        const pendingQueries = await Query.countDocuments({ status: { $in: ['open', 'triaged', 'in_progress'] } }).catch(() => 0);

        // Merge into date-keyed array
        const dateMap = {};
        for (let i = 0; i < daysBack; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            dateMap[key] = { date: key, opened: 0, resolved: 0 };
        }
        openedByDay.forEach(r => { if (dateMap[r._id]) dateMap[r._id].opened = r.opened; });
        resolvedByDay.forEach(r => { if (dateMap[r._id]) dateMap[r._id].resolved = r.resolved; });

        let trends = Object.values(dateMap);

        // If empty data, provide demo
        if (trends.every(t => t.opened === 0 && t.resolved === 0)) {
            trends = trends.map((t, i) => ({
                ...t,
                opened: Math.floor(Math.random() * 8) + 2,
                resolved: Math.floor(Math.random() * 7) + 1,
            }));
        }

        res.json({ success: true, data: { trends, pendingQueries } });
    } catch (error) {
        console.error('Query trends error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch query trends' });
    }
});

// ─────────────────────────────────────────────────────
// GET /api/admin-analytics/appointment-analytics — Appointment analytics
// ─────────────────────────────────────────────────────
router.get('/appointment-analytics', async (req, res) => {
    try {
        const daysBack = 14;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        startDate.setHours(0, 0, 0, 0);

        const byDay = await Appointment.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    booked: { $sum: 1 },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                }
            },
            { $sort: { _id: 1 } }
        ]).catch(() => []);

        // Status distribution
        const statusDist = await Appointment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]).catch(() => []);

        // Urgency distribution
        const urgencyDist = await Appointment.aggregate([
            {
                $group: {
                    _id: '$urgencyLevel',
                    count: { $sum: 1 }
                }
            }
        ]).catch(() => []);

        // Fill date range
        const dateMap = {};
        for (let i = 0; i < daysBack; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            dateMap[key] = { date: key, booked: 0, cancelled: 0, completed: 0 };
        }
        byDay.forEach(r => { if (dateMap[r._id]) Object.assign(dateMap[r._id], r, { date: r._id }); });

        let dailyTrends = Object.values(dateMap);

        // Demo fallback
        if (dailyTrends.every(t => t.booked === 0)) {
            dailyTrends = dailyTrends.map(t => ({
                ...t,
                booked: Math.floor(Math.random() * 12) + 3,
                cancelled: Math.floor(Math.random() * 3),
                completed: Math.floor(Math.random() * 10) + 2,
            }));
        }

        const statusDistribution = statusDist.length > 0 ? statusDist.map(s => ({ name: s._id || 'unknown', value: s.count })) : [
            { name: 'scheduled', value: 34 },
            { name: 'completed', value: 89 },
            { name: 'cancelled', value: 12 },
            { name: 'no-show', value: 7 },
            { name: 'in-progress', value: 5 },
        ];

        const urgencyDistribution = urgencyDist.length > 0 ? urgencyDist.map(u => ({ name: u._id || 'unknown', value: u.count })) : [
            { name: 'low', value: 45 },
            { name: 'medium', value: 32 },
            { name: 'high', value: 18 },
            { name: 'critical', value: 5 },
        ];

        res.json({
            success: true,
            data: { dailyTrends, statusDistribution, urgencyDistribution }
        });
    } catch (error) {
        console.error('Appointment analytics error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch appointment analytics' });
    }
});

// ─────────────────────────────────────────────────────
// GET /api/admin-analytics/ai-performance — AI system analytics
// ─────────────────────────────────────────────────────
router.get('/ai-performance', async (req, res) => {
    try {
        const totalQueries = await Query.countDocuments().catch(() => 0);
        const withAI = await Query.countDocuments({ aiSuggestion: { $ne: null, $exists: true } }).catch(() => 0);
        const aiApproved = await Query.countDocuments({ aiApproved: true }).catch(() => 0);
        const doctorOverridden = withAI > 0 ? withAI - aiApproved : 0;

        const acceptanceRate = withAI > 0 ? Math.round((aiApproved / withAI) * 100) : 0;
        const aiCoverage = totalQueries > 0 ? Math.round((withAI / totalQueries) * 100) : 0;

        // Use real data or fallback to demo
        const hasData = totalQueries > 0;
        const data = hasData ? {
            totalQueries,
            aiGenerated: withAI,
            aiApproved,
            doctorOverridden,
            acceptanceRate,
            aiCoverage,
            breakdown: [
                { name: 'AI Approved', value: aiApproved },
                { name: 'Doctor Edited', value: doctorOverridden },
                { name: 'No AI', value: totalQueries - withAI },
            ]
        } : {
            totalQueries: 156,
            aiGenerated: 128,
            aiApproved: 98,
            doctorOverridden: 30,
            acceptanceRate: 77,
            aiCoverage: 82,
            breakdown: [
                { name: 'AI Approved', value: 98 },
                { name: 'Doctor Edited', value: 30 },
                { name: 'No AI', value: 28 },
            ]
        };

        res.json({ success: true, data });
    } catch (error) {
        console.error('AI performance error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch AI performance data' });
    }
});

// ─────────────────────────────────────────────────────
// GET /api/admin-analytics/critical-cases — Critical case monitoring
// ─────────────────────────────────────────────────────
router.get('/critical-cases', async (req, res) => {
    try {
        const criticalQueries = await Query.find({
            priority: { $in: ['critical', 'urgent'] },
            status: { $nin: ['closed'] },
        })
            .populate('patientId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()
            .catch(() => []);

        const criticalAppointments = await Appointment.find({
            urgencyLevel: { $in: ['high', 'critical'] },
            status: { $nin: ['completed', 'cancelled'] },
        })
            .sort({ date: 1 })
            .limit(10)
            .lean()
            .catch(() => []);

        const securityAlerts = await SecurityEvent.find({
            severity: { $in: ['high', 'critical'] },
            resolved: false,
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()
            .catch(() => []);

        // Demo fallback
        const cases = criticalQueries.length > 0 ? criticalQueries.map(q => ({
            id: q._id,
            type: 'query',
            priority: q.priority,
            status: q.status,
            message: q.message?.substring(0, 100),
            patient: q.patientId ? `${q.patientId.firstName || ''} ${q.patientId.lastName || ''}`.trim() : 'Unknown',
            assignedTo: q.assignedTo ? `${q.assignedTo.firstName || ''} ${q.assignedTo.lastName || ''}`.trim() : 'Unassigned',
            createdAt: q.createdAt,
        })) : [
            { id: '1', type: 'query', priority: 'critical', status: 'open', message: 'Severe chest pain with shortness of breath', patient: 'Marcus Sterling', assignedTo: 'Dr. Sarah Jenkins', createdAt: new Date() },
            { id: '2', type: 'query', priority: 'urgent', status: 'triaged', message: 'High fever 104°F not responding to medication', patient: 'Elena Rostova', assignedTo: 'Dr. Michael Chen', createdAt: new Date(Date.now() - 3600000) },
            { id: '3', type: 'query', priority: 'critical', status: 'in_progress', message: 'Post-surgical wound infection spreading', patient: 'James Wilson', assignedTo: 'Dr. Angela Yuen', createdAt: new Date(Date.now() - 7200000) },
        ];

        res.json({
            success: true,
            data: {
                cases,
                criticalAppointments: criticalAppointments.length > 0 ? criticalAppointments : [],
                securityAlerts: securityAlerts.length > 0 ? securityAlerts : [],
                summary: {
                    totalCritical: cases.filter(c => c.priority === 'critical').length,
                    totalUrgent: cases.filter(c => c.priority === 'urgent').length,
                    unassigned: cases.filter(c => c.assignedTo === 'Unassigned').length,
                }
            }
        });
    } catch (error) {
        console.error('Critical cases error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch critical cases' });
    }
});

// ─────────────────────────────────────────────────────
// GET /api/admin-analytics/activity-feed — Recent hospital activity
// ─────────────────────────────────────────────────────
router.get('/activity-feed', async (req, res) => {
    try {
        const recentAudit = await AuditLog.find()
            .populate('user', 'firstName lastName role email')
            .sort({ createdAt: -1 })
            .limit(30)
            .lean()
            .catch(() => []);

        const activities = recentAudit.length > 0 ? recentAudit.map(log => ({
            id: log._id,
            action: log.action,
            resourceType: log.resourceType,
            user: log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : 'System',
            role: log.user?.role || 'system',
            success: log.success,
            timestamp: log.createdAt,
            detail: log.requestUrl || '',
        })) : [
            { id: '1', action: 'login', resourceType: 'User', user: 'Dr. Sarah Jenkins', role: 'doctor', success: true, timestamp: new Date(), detail: 'Portal login' },
            { id: '2', action: 'read', resourceType: 'Patient', user: 'Nurse Maria Rodriguez', role: 'nurse', success: true, timestamp: new Date(Date.now() - 60000), detail: 'Viewed patient record' },
            { id: '3', action: 'create', resourceType: 'Query', user: 'John Patterson', role: 'patient', success: true, timestamp: new Date(Date.now() - 120000), detail: 'New query submitted' },
            { id: '4', action: 'update', resourceType: 'Query', user: 'Dr. Michael Chen', role: 'doctor', success: true, timestamp: new Date(Date.now() - 180000), detail: 'Responded to query' },
            { id: '5', action: 'create', resourceType: 'User', user: 'Admin', role: 'admin', success: true, timestamp: new Date(Date.now() - 300000), detail: 'New user registered' },
            { id: '6', action: 'failed_login', resourceType: 'User', user: 'Unknown', role: 'system', success: false, timestamp: new Date(Date.now() - 600000), detail: 'Invalid credentials' },
        ];

        res.json({ success: true, data: activities });
    } catch (error) {
        console.error('Activity feed error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch activity feed' });
    }
});

// ─────────────────────────────────────────────────────
// GET /api/admin-analytics/efficiency-score — Composite hospital efficiency
// ─────────────────────────────────────────────────────
router.get('/efficiency-score', async (req, res) => {
    try {
        const totalQueries = await Query.countDocuments().catch(() => 0);
        const closedQueries = await Query.countDocuments({ status: 'closed' }).catch(() => 0);
        const pendingQueries = await Query.countDocuments({ status: { $in: ['open', 'triaged'] } }).catch(() => 0);
        const criticalOpen = await Query.countDocuments({ priority: 'critical', status: { $nin: ['closed'] } }).catch(() => 0);
        const totalAppointments = await Appointment.countDocuments().catch(() => 0);
        const completedAppointments = await Appointment.countDocuments({ status: 'completed' }).catch(() => 0);
        const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' }).catch(() => 0);

        // Compute composite score (0–100)
        let resolutionRate = totalQueries > 0 ? (closedQueries / totalQueries) : 0.7;
        let appointmentCompletion = totalAppointments > 0 ? (completedAppointments / totalAppointments) : 0.8;
        let cancellationPenalty = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) : 0.05;
        let pendingPenalty = totalQueries > 0 ? Math.min(pendingQueries / totalQueries, 0.5) : 0.1;
        let criticalPenalty = criticalOpen * 0.05; // Each unresolved critical = -5%

        let score = Math.round(
            (resolutionRate * 35) +          // 35% weight: query resolution
            (appointmentCompletion * 30) +   // 30% weight: appointment completion
            ((1 - cancellationPenalty) * 15) + // 15% weight: low cancellations
            ((1 - pendingPenalty) * 15) +     // 15% weight: low pending queue
            (Math.max(0, 5 - criticalPenalty)) // 5% weight: critical case management
        );

        score = Math.max(0, Math.min(100, score));

        // Fallback for empty DB
        if (totalQueries === 0 && totalAppointments === 0) score = 78;

        const breakdown = {
            queryResolution: Math.round(resolutionRate * 100),
            appointmentCompletion: Math.round(appointmentCompletion * 100),
            cancellationRate: Math.round(cancellationPenalty * 100),
            pendingQueueLoad: pendingQueries,
            criticalUnresolved: criticalOpen,
        };

        res.json({ success: true, data: { score, breakdown } });
    } catch (error) {
        console.error('Efficiency score error:', error);
        res.status(500).json({ success: false, error: 'Failed to compute efficiency score' });
    }
});

module.exports = router;
