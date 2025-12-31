const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('../Models/Jobs');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

async function updateExpiredJobs() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const now = new Date();
        
        // Find all jobs where deadline has passed and status is not completed or cancelled
        const expiredJobs = await Job.find({
            deadline: { $lt: now },
            status: { $nin: ['completed', 'cancelled'] }
        });

        console.log(`📊 Found ${expiredJobs.length} expired jobs to update`);

        if (expiredJobs.length === 0) {
            console.log('✅ No expired jobs found');
            process.exit(0);
        }

        // Update each expired job
        const updates = expiredJobs.map(job => {
            return Job.updateOne(
                { _id: job._id },
                { 
                    $set: { 
                        status: 'completed',
                        closedAt: job.deadline, // Set closedAt to the deadline date
                        updatedAt: now
                    } 
                }
            );
        });

        await Promise.all(updates);

        console.log(`✅ Updated ${expiredJobs.length} expired jobs to 'completed' status`);
        console.log(`📋 Sample updated jobs:`);
        
        // Show sample of updated jobs
        const sample = expiredJobs.slice(0, 5);
        sample.forEach((job, index) => {
            console.log(`   ${index + 1}. "${job.title}"`);
            console.log(`      - Deadline: ${job.deadline.toLocaleDateString()}`);
            console.log(`      - Previous Status: ${job.status} → New Status: completed`);
        });

        if (expiredJobs.length > 5) {
            console.log(`   ... and ${expiredJobs.length - 5} more jobs`);
        }

        // Show updated statistics
        const allJobs = await Job.countDocuments();
        const openJobs = await Job.countDocuments({ status: 'open' });
        const inProgressJobs = await Job.countDocuments({ status: 'in_progress' });
        const completedJobs = await Job.countDocuments({ status: 'completed' });
        const cancelledJobs = await Job.countDocuments({ status: 'cancelled' });

        console.log(`\n📊 Updated Job Statistics:`);
        console.log(`   - Total Jobs: ${allJobs}`);
        console.log(`   - Open: ${openJobs}`);
        console.log(`   - In Progress: ${inProgressJobs}`);
        console.log(`   - Completed: ${completedJobs}`);
        console.log(`   - Cancelled: ${cancelledJobs}`);

        console.log('\n✅ All expired jobs have been updated successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating expired jobs:', error);
        process.exit(1);
    }
}

updateExpiredJobs();
