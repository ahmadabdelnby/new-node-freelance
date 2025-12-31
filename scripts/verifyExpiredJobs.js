const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('../Models/Jobs');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

async function verifyExpiredJobs() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const now = new Date();
        
        // Check for expired jobs that are still open or in_progress
        const openExpired = await Job.find({
            status: 'open',
            deadline: { $lt: now }
        });

        const inProgressExpired = await Job.find({
            status: 'in_progress',
            deadline: { $lt: now }
        });

        console.log('📊 Verification:');
        console.log(`   - Expired Open Jobs: ${openExpired.length}`);
        console.log(`   - Expired In-Progress Jobs: ${inProgressExpired.length}`);
        
        if (openExpired.length === 0 && inProgressExpired.length === 0) {
            console.log('✅ Perfect! No expired jobs with open/in_progress status');
        } else {
            console.log('❌ Still have expired jobs that need updating:');
            if (openExpired.length > 0) {
                console.log('\n   Expired Open Jobs:');
                openExpired.slice(0, 5).forEach(job => {
                    console.log(`   - ${job.title} (Deadline: ${job.deadline.toLocaleDateString()})`);
                });
            }
            if (inProgressExpired.length > 0) {
                console.log('\n   Expired In-Progress Jobs:');
                inProgressExpired.slice(0, 5).forEach(job => {
                    console.log(`   - ${job.title} (Deadline: ${job.deadline.toLocaleDateString()})`);
                });
            }
        }

        // Show current jobs with future deadlines
        const openFuture = await Job.countDocuments({
            status: 'open',
            deadline: { $gte: now }
        });

        const inProgressFuture = await Job.countDocuments({
            status: 'in_progress',
            deadline: { $gte: now }
        });

        console.log('\n📈 Active Jobs (with future deadlines):');
        console.log(`   - Open: ${openFuture}`);
        console.log(`   - In Progress: ${inProgressFuture}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error verifying jobs:', error);
        process.exit(1);
    }
}

verifyExpiredJobs();
