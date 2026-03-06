const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
    try {
        // First, try connecting to MongoDB
        console.log('🔄 Attempting to connect to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        console.log('✅ MongoDB Connected Successfully');
        console.log(`📍 Database: ${conn.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.log('❌ MongoDB connection failed:', error.message);
        console.log('🔄 Falling back to mock database for development...');
        
        // Set a flag to indicate we're using mock database
        global.useMockDB = true;
        
        // Don't exit - continue with mock database
        logger.warn('Using mock database - data will not persist');
        console.log('⚠️  Note: Using in-memory mock database. Data will not persist between restarts.');
        console.log('📝 To use MongoDB: Install MongoDB locally or configure MONGODB_URI for cloud connection');
    }
};

module.exports = connectDB;