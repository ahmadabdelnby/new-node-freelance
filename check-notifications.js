require('dotenv').config();
const mongoose = require('mongoose');

async function checkNotifications() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const Notification = require('./Models/notification');

        const count = await Notification.countDocuments();
        console.log('\n📊 Total notifications in DB:', count);

        const samples = await Notification.find()
            .limit(5)
            .sort({ createdAt: -1 });

        console.log('\n📋 Sample notifications:');
        samples.forEach((n, index) => {
            console.log(`\n${index + 1}. Notification:`);
            console.log('   - ID:', n._id);
            console.log('   - User:', n.user?.email || n.user);
            console.log('   - Type:', n.type);
            console.log('   - Content:', n.content);
            console.log('   - IsRead:', n.isRead);
            console.log('   - Created:', n.createdAt);
        });

        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkNotifications();
