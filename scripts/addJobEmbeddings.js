const mongoose = require('mongoose');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const Job = require('../Models/Jobs');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set in .env file');
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Generate embedding for text
async function generateEmbedding(text) {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: text,
        });
        
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        return null;
    }
}

// Add delay to avoid rate limits
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function addEmbeddingsToJobs() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all jobs without embeddings
        const jobs = await Job.find({
            $or: [
                { embedding: { $exists: false } },
                { embedding: null },
                { embedding: [] }
            ]
        });

        if (jobs.length === 0) {
            console.log('✅ All jobs already have embeddings!');
            process.exit(0);
        }

        console.log(`📊 Found ${jobs.length} jobs without embeddings`);
        console.log('🔄 Starting to generate embeddings...\n');

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            
            try {
                // Combine title and description for better context
                const textForEmbedding = `${job.title}\n\n${job.description}`;
                
                console.log(`[${i + 1}/${jobs.length}] Processing: "${job.title.substring(0, 50)}..."`);
                
                // Generate embedding
                const embedding = await generateEmbedding(textForEmbedding);
                
                if (embedding) {
                    // Update job with embedding
                    await Job.findByIdAndUpdate(job._id, {
                        embedding: embedding
                    });
                    
                    successCount++;
                    console.log(`✅ Successfully added embedding (${embedding.length} dimensions)`);
                } else {
                    errorCount++;
                    console.log(`❌ Failed to generate embedding`);
                }
                
                // Add delay to avoid rate limits (OpenAI has 3000 RPM limit for text-embedding-ada-002)
                // Wait 200ms between requests (allows ~300 requests per minute)
                if (i < jobs.length - 1) {
                    await delay(200);
                }
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error processing job "${job.title}":`, error.message);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   - Successfully processed: ${successCount}`);
        console.log(`   - Failed: ${errorCount}`);
        console.log(`   - Total: ${jobs.length}`);
        console.log('\n✅ Embedding generation completed!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addEmbeddingsToJobs();
