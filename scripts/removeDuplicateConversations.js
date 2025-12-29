require('dotenv').config();
const mongoose = require('mongoose');
const { Conversation } = require('../Models/Chat');

// MongoDB connection - use environment variable
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.error('Please make sure you have a .env file with MONGODB_URI');
    process.exit(1);
}

async function removeDuplicateConversations() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all conversations grouped by job and participants
        const conversations = await Conversation.aggregate([
            {
                $group: {
                    _id: {
                        job: '$job',
                        participants: '$participants'
                    },
                    conversations: { $push: '$$ROOT' },
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 } // Only groups with duplicates
                }
            }
        ]);

        console.log(`\n📊 Found ${conversations.length} groups with duplicate conversations`);

        let totalDeleted = 0;

        for (const group of conversations) {
            const conversationList = group.conversations;

            // Sort by createdAt (keep oldest) or lastMessage (keep most recent)
            conversationList.sort((a, b) => {
                // Keep the one with messages, or the oldest one
                if (a.lastMessage && !b.lastMessage) return -1;
                if (!a.lastMessage && b.lastMessage) return 1;
                return new Date(a.createdAt) - new Date(b.createdAt);
            });

            // Keep the first one, delete the rest
            const toKeep = conversationList[0];
            const toDelete = conversationList.slice(1);

            console.log(`\n🔍 Job: ${group._id.job}`);
            console.log(`   Participants: ${group._id.participants.join(', ')}`);
            console.log(`   Total: ${conversationList.length} conversations`);
            console.log(`   Keeping: ${toKeep._id}`);
            console.log(`   Deleting: ${toDelete.length} duplicate(s)`);

            // Delete duplicates
            for (const conv of toDelete) {
                await Conversation.findByIdAndDelete(conv._id);
                console.log(`   ❌ Deleted: ${conv._id}`);
                totalDeleted++;
            }
        }

        console.log(`\n✅ Cleanup complete!`);
        console.log(`📊 Total conversations deleted: ${totalDeleted}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

removeDuplicateConversations();
