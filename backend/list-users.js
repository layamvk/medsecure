require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const listUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('\n📋 REGISTERED USERS IN DATABASE:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const users = await User.find({}).select('email username role createdAt');
        
        if (users.length === 0) {
            console.log('⚠️  No users found in database');
        } else {
            users.forEach(u => {
                console.log(`✓ Email: ${u.email}`);
                console.log(`  Username: ${u.username}`);
                console.log(`  Role: ${u.role}`);
                console.log(`  Created: ${u.createdAt}`);
                console.log('');
            });
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

listUsers();
