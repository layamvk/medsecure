const Appointment = require('../models/Appointment');
const { User, AuditLog } = require('../models');

// In-memory store for mock mode
const mockAppointments = [];
let mockIdCounter = 1;

const logEvent = async (userId, action, resourceType, resourceId, metadata = {}) => {
    if (global.useMockDB) return; // skip audit in mock mode
    try {
        await AuditLog.createLog({
            user: userId,
            action,
            resourceType,
            resourceId: resourceId ? resourceId.toString() : null,
            details: metadata
        });
    } catch (err) {
        console.error('Audit fail', err);
    }
};

// Internal helper: list appointments for a given user (used by controller and AI assistant)
const getAppointmentsForUser = async (user) => {
    if (global.useMockDB) {
        let filtered = mockAppointments.filter((a) => a.status !== 'cancelled');
        if (user.role === 'patient') {
            filtered = filtered.filter((a) => a.patientId === (user._id || user.id));
        } else if (user.role === 'doctor') {
            filtered = filtered.filter((a) => a.doctorId === (user._id || user.id) || a.doctorId == null);
        }
        return filtered;
    }

    const filter = {};
    if (user.role === 'patient') {
        filter.patientId = user._id || user.id;
    } else if (user.role === 'doctor') {
        filter.$or = [
            { doctorId: user._id || user.id },
            { doctorId: null },
        ];
    }

    const appointments = await Appointment.find(filter)
        .populate('patientId', 'firstName lastName email username')
        .populate('doctorId', 'firstName lastName email username')
        .sort({ date: 1 });

    return appointments;
};

// GET /api/appointments — list appointments for current user (or all for admin)
const getAppointments = async (req, res) => {
    try {
        const appointments = await getAppointmentsForUser(req.user);
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Internal helper: book an appointment for a user (used by controller and AI assistant)
const bookAppointmentForUser = async (user, payload) => {
    const { doctorName, department, date, time, reason, doctorId } = payload;

    if (!doctorName || !department || !date || !time) {
        const error = new Error('doctorName, department, date, and time are required');
        error.statusCode = 400;
        throw error;
    }

    if (global.useMockDB) {
        const appt = {
            _id: `mock-appt-${mockIdCounter++}`,
            patientId: user._id || user.id,
            doctorId: doctorId || null,
            doctorName,
            department,
            date: new Date(date).toISOString(),
            time,
            reason: reason || '',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
        };
        mockAppointments.push(appt);
        return { success: true, message: 'Appointment booked successfully', appointment: appt };
    }

    const appointment = await Appointment.create({
        patientId: user._id || user.id,
        doctorId: doctorId || null,
        doctorName,
        department,
        date: new Date(date),
        time,
        reason: reason || '',
        status: 'scheduled',
    });

    await logEvent(user.id || user._id, 'create', 'Appointment', appointment._id, {
        type: 'APPOINTMENT_BOOKED',
        doctorName,
        department,
        date,
        time,
    });

    return { success: true, message: 'Appointment booked successfully', appointment };
};

// POST /api/appointments — book a new appointment
const createAppointment = async (req, res) => {
    try {
        const result = await bookAppointmentForUser(req.user, req.body);
        const statusCode = result?.success ? 201 : 400;
        res.status(statusCode).json(result);
    } catch (error) {
        const status = error.statusCode || 500;
        res.status(status).json({ error: 'Server error', details: error.message });
    }
};

// PATCH /api/appointments/:id — update appointment status
const updateAppointment = async (req, res) => {
    try {
        const { status, notes } = req.body;

        if (global.useMockDB) {
            const idx = mockAppointments.findIndex(a => a._id === req.params.id);
            if (idx === -1) return res.status(404).json({ error: 'Appointment not found' });
            if (status) mockAppointments[idx].status = status;
            if (notes) mockAppointments[idx].notes = notes;
            return res.json({ success: true, appointment: mockAppointments[idx] });
        }

        const update = {};
        if (status) update.status = status;
        if (notes) update.notes = notes;

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        );

        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        await logEvent(req.user.id || req.user._id, 'update', 'Appointment', appointment._id, {
            type: 'APPOINTMENT_UPDATED',
            status
        });

        res.json({ success: true, appointment });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// DELETE /api/appointments/:id — cancel appointment
const cancelAppointment = async (req, res) => {
    try {
        if (global.useMockDB) {
            const idx = mockAppointments.findIndex(a => a._id === req.params.id);
            if (idx === -1) return res.status(404).json({ error: 'Appointment not found' });
            mockAppointments[idx].status = 'cancelled';
            return res.json({ success: true, message: 'Appointment cancelled', appointment: mockAppointments[idx] });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );

        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        await logEvent(req.user.id || req.user._id, 'delete', 'Appointment', appointment._id, {
            type: 'APPOINTMENT_CANCELLED'
        });

        res.json({ success: true, message: 'Appointment cancelled', appointment });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// GET /api/appointments/doctors — get available doctors
const getDoctors = async (req, res) => {
    try {
        // Try to get real doctors from DB
        let doctors = [];
        if (!global.useMockDB) {
            doctors = await User.find({ role: 'doctor', isActive: true })
                .select('firstName lastName email username')
                .lean();
        }

        // If no real doctors, return demo list
        if (doctors.length === 0) {
            doctors = [
                { _id: 'doc-1', firstName: 'Evelyn', lastName: 'Reed', department: 'Cardiology', email: 'e.reed@medsecure.com' },
                { _id: 'doc-2', firstName: 'Marcus', lastName: 'Thorne', department: 'Neurology', email: 'm.thorne@medsecure.com' },
                { _id: 'doc-3', firstName: 'Julian', lastName: 'Hayes', department: 'General Medicine', email: 'j.hayes@medsecure.com' },
                { _id: 'doc-4', firstName: 'Lena', lastName: 'Petrova', department: 'Pediatrics', email: 'l.petrova@medsecure.com' },
                { _id: 'doc-5', firstName: 'Sarah', lastName: 'Jenkins', department: 'Internal Medicine', email: 's.jenkins@medsecure.com' },
            ];
        }

        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

module.exports = {
    getAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    getDoctors,
    // Helpers reused by AI assistant flows
    getAppointmentsForUser,
    bookAppointmentForUser,
};
