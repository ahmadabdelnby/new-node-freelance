const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('../Models/Jobs');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

async function clearEmbeddings() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const result = await Job.updateMany({}, { $unset: { embedding: '' } });
        console.log(`🧹 Cleared embeddings from ${result.modifiedCount} jobs`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

clearEmbeddings();
