const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../Models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

async function updateVerifications() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Update all users with realistic verification status
        // Only email should be verified by default (assume verified during registration)
        // Phone and Identity need manual verification
        const result = await User.updateMany(
            {},
            {
                $set: {
                    isEmailVerified: true,  // Assume verified at registration
                    isPhoneVerified: false, // Needs OTP verification
                    isIdentityVerified: false, // Needs document upload
                    lastSeen: new Date()
                }
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} users with verification fields`);

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateVerifications();
