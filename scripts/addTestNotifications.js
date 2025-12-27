const mongoose = require('mongoose');
const Notification = require('../Models/notification');
const User = require('../Models/User');
require('dotenv').config();

const addTestNotifications = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI;

        if (!mongoUri) {
            console.error('❌ MongoDB URI not found in environment variables');
            console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('MONGO') || key.includes('DB')));
            process.exit(1);
        }

        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Get all users
        const users = await User.find().limit(5);

        if (users.length === 0) {
            console.log('❌ No users found in database');
            process.exit(1);
        }

        console.log(`📋 Found ${users.length} users`);

        // Create test notifications for each user
        const notificationTypes = [
            {
                type: 'new_proposal',
                content: 'You received a new proposal for "Build a Freelance Platform"',
                category: 'proposal'
            },
            {
                type: 'proposal_accepted',
                content: 'Your proposal for "Mobile App Development" was accepted!',
                category: 'proposal'
            },
            {
                type: 'contract_completed',
                content: 'Contract for "Website Redesign" has been completed',
                category: 'contract'
            },
            {
                type: 'payment_received',
                content: 'You received a payment of $500',
                category: 'payment'
            },
            {
                type: 'new_message',
                content: 'You have a new message from John Doe',
                category: 'message'
            }
        ];

        let totalCreated = 0;

        for (const user of users) {
            console.log(`\n👤 Creating notifications for: ${user.first_name} ${user.last_name} (${user._id})`);

            for (const notif of notificationTypes) {
                const notification = await Notification.create({
                    user: user._id,
                    type: notif.type,
                    content: notif.content,
                    category: notif.category,
                    linkUrl: notif.type === 'new_proposal' ? '/jobs' : '/contracts',
                    isRead: Math.random() > 0.5 // Random read/unread status
                });

                console.log(`  ✅ Created: ${notif.type}`);
                totalCreated++;
            }
        }

        console.log(`\n🎉 Successfully created ${totalCreated} test notifications!`);

        // Show summary
        const allNotifications = await Notification.find();
        const unreadCount = await Notification.countDocuments({ isRead: false });
        console.log(`\n📊 Total notifications in database: ${allNotifications.length}`);
        console.log(`📊 Unread notifications: ${unreadCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

addTestNotifications();
