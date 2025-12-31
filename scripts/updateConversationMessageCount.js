require('dotenv').config();
const mongoose = require('mongoose');

async function updateConversationsWithMessageCount() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');
        const messagesCollection = db.collection('messages');

        // Get all conversations
        const conversations = await conversationsCollection.find().toArray();
        console.log(`📊 Found ${conversations.length} conversations to update`);

        let updated = 0;
        for (const conv of conversations) {
            // Count messages for this conversation
            const messageCount = await messagesCollection.countDocuments({ 
                conversation: conv._id 
            });

            // Update the conversation with messageCount
            await conversationsCollection.updateOne(
                { _id: conv._id },
                { $set: { messageCount: messageCount } }
            );
            
            updated++;
            if (updated % 10 === 0) {
                console.log(`⏳ Updated ${updated}/${conversations.length} conversations...`);
            }
        }

        console.log(`✅ Successfully updated ${updated} conversations with messageCount`);

        // Show sample
        const samples = await conversationsCollection.find().limit(5).toArray();
        console.log(`\n📋 Sample conversations after update:`);
        samples.forEach((conv, index) => {
            console.log(`${index + 1}. ID: ${conv._id} | messageCount: ${conv.messageCount}`);
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateConversationsWithMessageCount();
