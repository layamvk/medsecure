const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
    try {
        // First, try connecting to MongoDB
        console.log('🔄 Attempting to connect to MongoDB Atlas...');
        console.log('📡 Connection URI:', process.env.MONGODB_URI ? 'Configured' : 'MISSING');
        
        // Set mongoose options to prevent buffering issues
        mongoose.set('bufferTimeoutMS', 30000); // 30 second timeout for operations
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000, // Increased timeout to 15s
            socketTimeoutMS: 45000,
            family: 4 // Force IPv4
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        console.log('✅ MongoDB Atlas Connected Successfully');
        console.log(`📍 Database: ${conn.connection.name}`);
        global.useMockDB = false;
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
            global.useMockDB = true;
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
            global.useMockDB = false;
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.log('❌ MongoDB Atlas connection failed:', error.message);
        console.log('📋 Error details:', error.name);
        
        console.log('\n🔒 IP WHITELIST ISSUE DETECTED!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Your current IP address is NOT whitelisted in MongoDB Atlas.');
        console.log('\n📝 TO FIX THIS:');
        console.log('1. Go to: https://cloud.mongodb.com');
        console.log('2. Click "Network Access" in the left menu');
        console.log('3. Click "Add IP Address"');
        console.log('4. Click "Allow Access from Anywhere" (or add your specific IP)');
        console.log('5. Click "Confirm" and wait 1-2 minutes');
        console.log('6. Restart this server');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Set a flag to indicate we're using mock database
        global.useMockDB = true;
        
        // Disable buffering to prevent timeout errors
        mongoose.set('bufferCommands', false);
        
        // Don't exit - continue with limited functionality
        logger.warn('Server will run in LIMITED MODE - database operations will fail');
        console.log('⚠️  Server running in LIMITED MODE');
        console.log('⚠️  All database operations will return errors until MongoDB is connected\n');
    }
};

module.exports = connectDB;