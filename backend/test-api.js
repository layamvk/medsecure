// Simple test to create admin user via API
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function createTestAdmin() {
    try {
        console.log('Creating admin user...');
        
        const adminData = {
            email: 'admin@medsecure.com',
            username: 'admin',
            password: 'SecureAdmin123!',
            firstName: 'System',
            lastName: 'Administrator',
            role: 'admin',
            isActive: true
        };

        const response = await axios.post(`${API_URL}/auth/register`, adminData);
        console.log('✅ Admin user created successfully:', response.data);
        
        return response.data;
    } catch (error) {
        console.log('❌ Error creating admin user:', error.response?.data || error.message);
        return null;
    }
}

async function testLogin() {
    try {
        console.log('Testing admin login...');
        
        const loginData = {
            email: 'admin@medsecure.com',
            password: 'SecureAdmin123!'
        };

        const response = await axios.post(`${API_URL}/auth/login`, loginData);
        console.log('✅ Admin login successful:', response.data);
        
        return response.data;
    } catch (error) {
        console.log('❌ Error logging in:', error.response?.data || error.message);
        return null;
    }
}

async function createTestDoctor(token) {
    try {
        console.log('Creating doctor user...');
        
        const doctorData = {
            email: 'doctor@medsecure.com',
            username: 'doctor1',
            password: 'Doctor123!',
            firstName: 'John',
            lastName: 'Smith',
            role: 'doctor',
            isActive: true
        };

        const response = await axios.post(`${API_URL}/auth/register`, doctorData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Doctor user created successfully:', response.data);
        
        return response.data;
    } catch (error) {
        console.log('❌ Error creating doctor user:', error.response?.data || error.message);
        return null;
    }
}

async function testAPI() {
    console.log('🧪 Starting MedSecure API Test...\n');
    
    // Test health endpoint
    try {
        const health = await axios.get(`${API_URL}/../health`);
        console.log('✅ Health check:', health.data);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }
    
    // Create admin user
    const admin = await createTestAdmin();
    
    if (admin && admin.token) {
        // Test login
        const loginResult = await testLogin();
        
        if (loginResult && loginResult.token) {
            // Create doctor
            await createTestDoctor(loginResult.token);
        }
    }
    
    console.log('\n🎉 API test completed!');
    console.log('\n📝 Test Credentials:');
    console.log('Admin: admin@medsecure.com / SecureAdmin123!');
    console.log('Doctor: doctor@medsecure.com / Doctor123!');
}

// Run the test
testAPI().catch(console.error);