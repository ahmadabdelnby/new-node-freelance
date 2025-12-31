require('dotenv').config();
const mongoose = require('mongoose');

async function checkConversations() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get conversations collection directly
        const db = mongoose.connection.db;
        const conversationsCollection = db.collection('conversations');
        
        const conversations = await conversationsCollection.find().limit(5).toArray();
        
        console.log(`\n📊 Found ${conversations.length} sample conversations:`);
        conversations.forEach((conv, index) => {
            console.log(`\n${index + 1}. Conversation ID: ${conv._id}`);
            console.log(`   messageCount: ${conv.messageCount}`);
            console.log(`   participants: ${conv.participants?.length || 0}`);
            console.log(`   lastMessageAt: ${conv.lastMessageAt}`);
        });

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkConversations();
