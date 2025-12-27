const mongoose = require('mongoose');
const User = require('../Models/User');
require('dotenv').config();

/**
 * Script to update verification status for existing users
 * - If user has email → set isEmailVerified = true
 * - If user has phone_number → set isPhoneVerified = true
 * - isIdentityVerified remains false (no automatic verification)
 */

async function updateVerificationStatus() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance');
        console.log('✅ Connected to database\n');

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            let needsUpdate = false;
            const updates = {};

            // Auto-verify email if user has email (which is required, so all users have it)
            if (user.email && !user.isEmailVerified) {
                updates.isEmailVerified = true;
                needsUpdate = true;
            }

            // Auto-verify phone if user has phone_number
            if (user.phone_number && !user.isPhoneVerified) {
                updates.isPhoneVerified = true;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await User.updateOne({ _id: user._id }, { $set: updates });
                updatedCount++;

                console.log(`✓ Updated: ${user.first_name} ${user.last_name} (${user.email})`);
                if (updates.isEmailVerified) console.log('  → Email verified');
                if (updates.isPhoneVerified) console.log('  → Phone verified');
            } else {
                skippedCount++;
            }
        }

        console.log('\n=================================');
        console.log('📈 Update Summary:');
        console.log(`   Total users: ${users.length}`);
        console.log(`   ✅ Updated: ${updatedCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log('=================================\n');

        // Show verification status after update
        const verifiedUsers = await User.find({}).select('first_name last_name email phone_number isEmailVerified isPhoneVerified isIdentityVerified');

        console.log('📋 Verification Status (First 5 users):');
        console.log('─────────────────────────────────────');
        verifiedUsers.slice(0, 5).forEach(u => {
            console.log(`\n👤 ${u.first_name} ${u.last_name}`);
            console.log(`   Email: ${u.email} ${u.isEmailVerified ? '✓' : '✗'}`);
            console.log(`   Phone: ${u.phone_number || 'N/A'} ${u.isPhoneVerified ? '✓' : '✗'}`);
            console.log(`   Identity: ${u.isIdentityVerified ? '✓' : '✗'}`);
        });

        console.log('\n✅ Verification status updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating verification status:', error);
        process.exit(1);
    }
}

// Run the update
updateVerificationStatus();
