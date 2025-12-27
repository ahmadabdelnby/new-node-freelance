const mongoose = require('mongoose');
const Notification = require('../Models/notification');
require('dotenv').config();

const addNotificationsForCurrentUser = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI;

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Current logged-in user ID from the console
        const currentUserId = '694cdd7f80327fbc0c484635';

        console.log(`\n👤 Creating notifications for user: ${currentUserId}`);

        const notificationTypes = [
            {
                type: 'new_proposal',
                content: 'You received a new proposal for "Build a Freelance Platform"',
                category: 'proposal',
                linkUrl: '/jobs'
            },
            {
                type: 'proposal_accepted',
                content: 'Your proposal for "Mobile App Development" was accepted!',
                category: 'proposal',
                linkUrl: '/contracts'
            },
            {
                type: 'contract_completed',
                content: 'Contract for "Website Redesign" has been completed',
                category: 'contract',
                linkUrl: '/contracts'
            },
            {
                type: 'payment_received',
                content: 'You received a payment of $500',
                category: 'payment',
                linkUrl: '/payments'
            },
            {
                type: 'new_message',
                content: 'You have a new message from John Doe',
                category: 'message',
                linkUrl: '/chat'
            },
            {
                type: 'new_proposal',
                content: 'You received a new proposal for "E-commerce Website"',
                category: 'proposal',
                linkUrl: '/jobs'
            },
            {
                type: 'payment_received',
                content: 'You received a payment of $1200',
                category: 'payment',
                linkUrl: '/payments'
            }
        ];

        let created = 0;
        let unread = 0;

        for (const notif of notificationTypes) {
            const isRead = Math.random() > 0.6; // 40% unread

            await Notification.create({
                user: currentUserId,
                type: notif.type,
                content: notif.content,
                category: notif.category,
                linkUrl: notif.linkUrl,
                isRead: isRead
            });

            console.log(`  ✅ Created: ${notif.type} (${isRead ? 'Read' : 'Unread'})`);
            created++;
            if (!isRead) unread++;
        }

        console.log(`\n🎉 Successfully created ${created} notifications for current user!`);
        console.log(`📊 Unread: ${unread}, Read: ${created - unread}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

addNotificationsForCurrentUser();
