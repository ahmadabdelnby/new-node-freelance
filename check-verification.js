const mongoose = require('mongoose');
const User = require('./Models/User');

mongoose.connect('mongodb://localhost:27017/freelance')
    .then(async () => {
        console.log('Connected to database');

        const users = await User.find({})
            .select('first_name last_name email isEmailVerified isPhoneVerified isIdentityVerified')
            .limit(10);

        console.log('\n=== User Verification Status ===\n');

        users.forEach(u => {
            console.log(`Name: ${u.first_name} ${u.last_name}`);
            console.log(`Email: ${u.email}`);
            console.log(`Email Verified: ${u.isEmailVerified}`);
            console.log(`Phone Verified: ${u.isPhoneVerified}`);
            console.log(`Identity Verified: ${u.isIdentityVerified}`);
            console.log('---');
        });

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
