// Simple login test
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testLogin() {
    try {
        console.log('Testing admin login...');
        
        const loginData = {
            email: 'admin@medsecure.com',
            password: 'SecureAdmin123!'
        };

        const response = await axios.post(`${API_URL}/auth/login`, loginData);
        console.log('✅ Admin login successful!');
        console.log('User:', response.data.user);
        console.log('Token received:', response.data.token ? 'Yes' : 'No');
        
        return response.data;
    } catch (error) {
        console.log('❌ Error logging in:', error.response?.data || error.message);
        return null;
    }
}

testLogin().catch(console.error);