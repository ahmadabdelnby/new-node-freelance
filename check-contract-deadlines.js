// 🔥 Automated Contract Deadline Notification System
// This script checks active contracts and sends notifications at specific milestones

require('dotenv').config();
const mongoose = require('mongoose');
const cron = require('node-cron');

// Models
const Contract = require('./Models/Contract');
const Notification = require('./Models/notification');
const User = require('./Models/User');
const Job = require('./Models/Jobs');

// Services
const { sendEmail, emailTemplates } = require('./services/emailService');
const { getIO } = require('./services/socketService');

/**
 * Calculate time progress for a contract
 */
function calculateTimeProgress(contract) {
    if (!contract.startDate || !contract.calculatedDeadline) {
        return null;
    }

    const startTime = new Date(contract.startDate).getTime();
    const deadlineTime = new Date(contract.calculatedDeadline).getTime();
    const currentTime = new Date().getTime();

    const totalDuration = deadlineTime - startTime;
    const elapsed = currentTime - startTime;
    const remaining = deadlineTime - currentTime;

    const percentageElapsed = (elapsed / totalDuration) * 100;
    const daysRemaining = Math.ceil(remaining / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil(remaining / (1000 * 60 * 60));

    return {
        percentageElapsed: Math.round(percentageElapsed),
        daysRemaining,
        hoursRemaining,
        isOverdue: currentTime > deadlineTime,
        remaining: remaining
    };
}

/**
 * Send notification at specific milestone
 */
async function sendMilestoneNotification(contract, milestone, progress) {
    try {
        // Populate contract data
        await contract.populate([
            { path: 'client', select: 'first_name last_name email' },
            { path: 'freelancer', select: 'first_name last_name email' },
            { path: 'job', select: 'title' }
        ]);

        const { client, freelancer, job } = contract;
        const { daysRemaining, hoursRemaining } = progress;

        // Notification content based on milestone
        let title, message, urgency;

        if (milestone === '50%') {
            title = 'Contract Halfway Point';
            message = `The contract for "${job.title}" has reached the halfway point. ${daysRemaining} days remaining.`;
            urgency = 'info';
        } else if (milestone === '75%') {
            title = '75% Contract Progress';
            message = `The contract for "${job.title}" is 75% through. ${daysRemaining} days remaining.`;
            urgency = 'warning';
        } else if (milestone === '90%') {
            title = '⚠️ Deadline Approaching';
            message = `The contract for "${job.title}" is 90% through. Only ${daysRemaining} days remaining!`;
            urgency = 'urgent';
        } else if (milestone === '24h') {
            title = '🔴 Deadline in 24 Hours';
            message = `The contract for "${job.title}" is due in ${hoursRemaining} hours!`;
            urgency = 'critical';
        }

        // 📧 Send notification to FREELANCER
        await Notification.create({
            user: freelancer._id,
            type: 'contract_deadline_reminder',
            title: title,
            message: message,
            link: `/contracts/${contract._id}`,
            relatedContract: contract._id,
            priority: urgency === 'critical' ? 'high' : urgency === 'urgent' ? 'high' : 'normal'
        });

        // 📧 Send notification to CLIENT
        await Notification.create({
            user: client._id,
            type: 'contract_deadline_reminder',
            title: title,
            message: message,
            link: `/contracts/${contract._id}`,
            relatedContract: contract._id,
            priority: urgency === 'critical' ? 'high' : urgency === 'urgent' ? 'high' : 'normal'
        });

        console.log(`✅ Sent ${milestone} notifications for contract ${contract._id}`);

        // 🔥 Send Socket.io real-time notifications
        const io = getIO();
        if (io) {
            io.to(`user:${freelancer._id}`).emit('deadline_reminder', {
                contractId: contract._id,
                milestone,
                daysRemaining,
                message
            });

            io.to(`user:${client._id}`).emit('deadline_reminder', {
                contractId: contract._id,
                milestone,
                daysRemaining,
                message
            });
        }

        // 📧 Send emails
        try {
            // Email to freelancer
            if (freelancer.email) {
                const freelancerTemplate = emailTemplates.deadlineReminder(
                    freelancer.first_name,
                    job.title,
                    milestone,
                    daysRemaining,
                    contract._id
                );
                sendEmail({
                    to: freelancer.email,
                    subject: freelancerTemplate.subject,
                    html: freelancerTemplate.html
                });
            }

            // Email to client
            if (client.email) {
                const clientTemplate = emailTemplates.deadlineReminder(
                    client.first_name,
                    job.title,
                    milestone,
                    daysRemaining,
                    contract._id
                );
                sendEmail({
                    to: client.email,
                    subject: clientTemplate.subject,
                    html: clientTemplate.html
                });
            }

            console.log(`📧 Sent ${milestone} emails for contract ${contract._id}`);
        } catch (emailError) {
            console.error('⚠️ Failed to send emails:', emailError.message);
        }

        // Mark milestone as sent
        if (!contract.deadlineWarningsSent.includes(milestone)) {
            contract.deadlineWarningsSent.push(milestone);
            await contract.save();
        }

    } catch (error) {
        console.error(`❌ Error sending ${milestone} notification:`, error.message);
    }
}

/**
 * Check all active contracts for deadline milestones
 */
async function checkContractDeadlines() {
    try {
        console.log('\n⏰ Checking contract deadlines...', new Date().toLocaleString());

        const activeContracts = await Contract.find({
            status: 'active',
            calculatedDeadline: { $exists: true, $ne: null }
        });

        console.log(`📋 Found ${activeContracts.length} active contracts with deadlines`);

        for (const contract of activeContracts) {
            const progress = calculateTimeProgress(contract);

            if (!progress) continue;

            const { percentageElapsed, daysRemaining, hoursRemaining, isOverdue } = progress;

            // Skip if overdue
            if (isOverdue) {
                console.log(`⏭️ Contract ${contract._id} is overdue, skipping`);
                continue;
            }

            // Check 50% milestone
            if (percentageElapsed >= 50 && percentageElapsed < 60 && !contract.deadlineWarningsSent.includes('50%')) {
                console.log(`📍 Contract ${contract._id} reached 50% milestone`);
                await sendMilestoneNotification(contract, '50%', progress);
            }

            // Check 75% milestone
            if (percentageElapsed >= 75 && percentageElapsed < 85 && !contract.deadlineWarningsSent.includes('75%')) {
                console.log(`📍 Contract ${contract._id} reached 75% milestone`);
                await sendMilestoneNotification(contract, '75%', progress);
            }

            // Check 90% milestone
            if (percentageElapsed >= 90 && percentageElapsed < 95 && !contract.deadlineWarningsSent.includes('90%')) {
                console.log(`📍 Contract ${contract._id} reached 90% milestone`);
                await sendMilestoneNotification(contract, '90%', progress);
            }

            // Check 24 hours remaining
            if (hoursRemaining <= 24 && hoursRemaining > 0 && !contract.deadlineWarningsSent.includes('24h')) {
                console.log(`📍 Contract ${contract._id} has less than 24 hours remaining`);
                await sendMilestoneNotification(contract, '24h', progress);
            }
        }

        console.log('✅ Deadline check completed\n');
    } catch (error) {
        console.error('❌ Error checking contract deadlines:', error);
    }
}

/**
 * Start the cron job
 */
async function startDeadlineMonitoring() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for deadline monitoring');

        // Run immediately on startup
        await checkContractDeadlines();

        // Schedule to run every 6 hours
        // Cron format: minute hour day month weekday
        // '0 */6 * * *' = Every 6 hours at minute 0
        cron.schedule('0 */6 * * *', async () => {
            await checkContractDeadlines();
        });

        console.log('✅ Deadline monitoring cron job started (runs every 6 hours)');

        // For testing: Also run every hour in development
        if (process.env.NODE_ENV === 'development') {
            cron.schedule('0 * * * *', async () => {
                console.log('🧪 [DEV] Hourly deadline check');
                await checkContractDeadlines();
            });
            console.log('🧪 [DEV] Additional hourly check enabled');
        }

    } catch (error) {
        console.error('❌ Failed to start deadline monitoring:', error);
        process.exit(1);
    }
}

// Start if run directly
if (require.main === module) {
    startDeadlineMonitoring().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { startDeadlineMonitoring, checkContractDeadlines };
