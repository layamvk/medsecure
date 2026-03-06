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

module.exports = { initSocket, getIo };
