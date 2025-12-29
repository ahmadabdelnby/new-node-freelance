const { Conversation } = require('../Models/Chat');

// Remove duplicate conversations (admin only)
const removeDuplicateConversations = async (req, res) => {
    try {
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
        const deletedIds = [];

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
            console.log(`   Keeping: ${toKeep._id}`);
            console.log(`   Deleting: ${toDelete.length} duplicate(s)`);

            // Delete duplicates
            for (const conv of toDelete) {
                await Conversation.findByIdAndDelete(conv._id);
                deletedIds.push(conv._id);
                totalDeleted++;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Duplicate conversations removed',
            totalGroups: conversations.length,
            totalDeleted,
            deletedIds
        });
    } catch (error) {
        console.error('❌ Error removing duplicates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove duplicate conversations',
            error: error.message
        });
    }
};

module.exports = {
    removeDuplicateConversations
};
