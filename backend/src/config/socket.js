const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            credentials: true
        }
    });

    // Authentication middleware for socket connections
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
            if (!token) {
                return next(new Error('Authentication error'));
            }

            const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
            const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

            socket.user = decoded; // Contains id and role
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id} (User Role: ${socket.user.role})`);

        // Join role-based room
        const roleRoom = `${socket.user.role}-room`;
        socket.join(roleRoom);

        // Also join personal room for direct notification
        socket.join(`user-${socket.user.id}`);

        // ── Real-time appointment acknowledgements ──
        socket.on('appointment:acknowledge', (data) => {
            console.log(`[SOCKET] Appointment ${data.appointmentId} acknowledged by ${socket.user.id}`);
            io.to('admin-room').emit('appointment:acknowledged', {
                appointmentId: data.appointmentId,
                acknowledgedBy: socket.user.id,
                timestamp: new Date().toISOString(),
            });
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized');
    }
    return io;
};

// ── Emit helpers for appointment workflow ──

/**
 * Emit when a new appointment is created.
 * Notifies: assigned doctor, admin room, receptionist room.
 */
const emitAppointmentCreated = (appointment) => {
    if (!io) return;
    const payload = {
        type: 'appointment_created',
        appointment,
        timestamp: new Date().toISOString(),
    };

    // Notify the assigned doctor
    if (appointment.doctorId) {
        io.to(`user-${appointment.doctorId}`).emit('appointment:created', payload);
    }
    // Notify all doctors (new unassigned appointments)
    io.to('doctor-room').emit('appointment:created', payload);
    // Notify admin & receptionist
    io.to('admin-room').emit('appointment:created', payload);
    io.to('receptionist-room').emit('appointment:created', payload);
    // Notify patient who booked
    if (appointment.patientId) {
        io.to(`user-${appointment.patientId}`).emit('appointment:created', payload);
    }
    console.log(`[SOCKET] appointment:created emitted for ${appointment._id}`);
};

/**
 * Emit when an appointment is updated (status change, notes, etc.)
 */
const emitAppointmentUpdated = (appointment) => {
    if (!io) return;
    const payload = {
        type: 'appointment_updated',
        appointment,
        timestamp: new Date().toISOString(),
    };

    if (appointment.doctorId) {
        io.to(`user-${appointment.doctorId}`).emit('appointment:updated', payload);
    }
    if (appointment.patientId) {
        io.to(`user-${appointment.patientId}`).emit('appointment:updated', payload);
    }
    io.to('admin-room').emit('appointment:updated', payload);
    io.to('receptionist-room').emit('appointment:updated', payload);
    console.log(`[SOCKET] appointment:updated emitted for ${appointment._id}`);
};

/**
 * Emit a critical alert for high-urgency appointments.
 * Broadcasts to all doctors, nurses, admins.
 */
const emitCriticalAlert = (appointment, urgencyData) => {
    if (!io) return;
    const payload = {
        type: 'critical_alert',
        appointment,
        urgency: urgencyData,
        timestamp: new Date().toISOString(),
    };

    io.to('doctor-room').emit('critical:alert', payload);
    io.to('nurse-room').emit('critical:alert', payload);
    io.to('admin-room').emit('critical:alert', payload);
    console.log(`[SOCKET] critical:alert emitted — urgency: ${urgencyData.urgencyLevel}`);
};

module.exports = {
    initSocket,
    getIo,
    emitAppointmentCreated,
    emitAppointmentUpdated,
    emitCriticalAlert,
};
