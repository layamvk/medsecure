require('dotenv').config();
const axios = require('axios');

const testLogin = async () => {
    const testAccounts = [
        { email: 'admin@medsecure.com', password: 'Admin@123456', role: 'Admin' },
        { email: 'dr.smith@medsecure.com', password: 'Doctor@123456', role: 'Doctor' },
    ];

    console.log('\n🔐 TESTING LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const account of testAccounts) {
        try {
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
            
            const response = await axios.post('http://localhost:3001/api/auth/login', {
                email: account.email,
                password: account.password
            });

            if (response.data?.success) {
                console.log(`✅ ${account.role} - ${account.email}`);
                console.log(`   Password: ${account.password}`);
                console.log(`   Status: LOGIN SUCCESSFUL\n`);
            }
        } catch (error) {
            if (error.response?.status === 401) {
                console.log(`❌ ${account.role} - ${account.email}`);
                console.log(`   Password: ${account.password}`);
                console.log(`   Status: INVALID CREDENTIALS\n`);
            } else if (error.response?.status === 429) {
                console.log(`⏳ ${account.role} - ${account.email}`);
                console.log(`   Status: RATE LIMITED (too many attempts)\n`);
            } else {
                console.log(`⚠️  ${account.role} - ${account.email}`);
                console.log(`   Error: ${error.message}\n`);
            }
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 TIP: Use these credentials in the browser at http://localhost:5173/login\n');
    process.exit(0);
};

testLogin();
