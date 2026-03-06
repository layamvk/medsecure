const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const slowDown = require('express-slow-down');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import database connection
const connectDB = require('./src/database/connection');

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const patientRoutes = require('./src/routes/patients');
const auditRoutes = require('./src/routes/audit');
const securityRoutes = require('./src/routes/security');
const privacyRoutes = require('./src/routes/privacy');
const queryRoutes = require('./src/routes/queryRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const xrayRoutes = require('./src/routes/xrayRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const adminAnalyticsRoutes = require('./src/routes/adminAnalyticsRoutes');
const http = require('http');
const { initSocket } = require('./src/config/socket');

// Import middleware
const { errorHandler } = require('./src/middleware/errorHandler');
const { logger } = require('./src/utils/logger');

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 100, // generous in dev, strict in prod
    message: {
        error: 'Too many authentication attempts, please try again later.'
    }
});

// Speed limiting
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes at full speed
    delayMs: () => 500, // Fixed: use function syntax for new version
    validate: { delayMs: false } // Disable warning message
});

app.use('/api/auth', authLimiter);
app.use('/api', limiter, speedLimiter);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize()); // Against NoSQL query injection
app.use(xss()); // Against XSS attacks

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/xray', xrayRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin-analytics', adminAnalyticsRoutes);
app.use('/api', fileRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Resource not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully');
    process.exit(0);
});

// Create HTTP server layer for Socket.IO
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Start server
// Default to 3001 so it matches the frontend axios baseURL and test scripts.
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    logger.info(`MedSecure Backend Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;