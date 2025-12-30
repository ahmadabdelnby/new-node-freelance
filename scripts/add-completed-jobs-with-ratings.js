const mongoose = require('mongoose');
const OpenAI = require('openai');
require('dotenv').config();

// Import models
const Job = require('../Models/Jobs');
const User = require('../Models/User');
const Skills = require('../Models/Skills');
const Specialties = require('../Models/Specialties');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelancing', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Generate embedding using OpenAI
async function generateEmbedding(text) {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-large',
            input: text
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        return null;
    }
}

// Sample completed jobs data
const completedJobsData = [
    {
        title: 'E-commerce Website Development',
        description: 'Built a full-featured e-commerce website with React and Node.js. Implemented payment gateway, product catalog, shopping cart, and admin dashboard. Responsive design for mobile and desktop.',
        specialtyName: 'Web Development',
        skillNames: ['React', 'Node.js', 'MongoDB', 'Express', 'Payment Integration'],
        budget: { type: 'fixed', amount: 2500 },
        duration: { value: 2, unit: 'months' },
        rating: { score: 5, comment: 'Excellent work! Very professional and delivered on time.' }
    },
    {
        title: 'Mobile App UI/UX Design',
        description: 'Designed a modern mobile app interface for a fitness tracking application. Created wireframes, mockups, and interactive prototypes. Followed material design principles.',
        specialtyName: 'Creative Design',
        skillNames: ['Figma', 'Adobe XD', 'Prototyping', 'Mobile Design'],
        budget: { type: 'fixed', amount: 1200 },
        duration: { value: 3, unit: 'weeks' },
        rating: { score: 4.5, comment: 'Great design skills and very responsive to feedback.' }
    },
    {
        title: 'SEO Optimization for Business Website',
        description: 'Performed comprehensive SEO audit and optimization. Improved search rankings, page speed, meta tags, and content structure. Increased organic traffic by 150%.',
        specialtyName: 'Digital Marketing',
        skillNames: ['SEO', 'Google Analytics', 'Keyword Research', 'Content Marketing'],
        budget: { type: 'fixed', amount: 800 },
        duration: { value: 30, unit: 'days' },
        rating: { score: 5, comment: 'Outstanding results! Our traffic increased significantly.' }
    },
    {
        title: 'Python Data Analysis Script',
        description: 'Developed Python scripts for data analysis and visualization. Processed large datasets, created charts and reports, automated data cleaning tasks.',
        specialtyName: 'Data Analysis',
        skillNames: ['Python', 'Pandas', 'NumPy', 'Data Visualization', 'Jupyter'],
        budget: { type: 'fixed', amount: 600 },
        duration: { value: 2, unit: 'weeks' },
        rating: { score: 4, comment: 'Good work, delivered as expected.' }
    },
    {
        title: 'WordPress Blog Setup and Customization',
        description: 'Set up WordPress blog with custom theme, plugins, and SEO optimization. Configured hosting, security, and backup solutions.',
        specialtyName: 'Website Creation',
        skillNames: ['WordPress', 'PHP', 'CSS', 'SEO', 'Web Hosting'],
        budget: { type: 'fixed', amount: 400 },
        duration: { value: 7, unit: 'days' },
        rating: { score: 4.5, comment: 'Fast and reliable. Great communication!' }
    },
    {
        title: 'Mobile App Development',
        description: 'Built cross-platform mobile app using React Native. Integrated REST APIs, push notifications, and offline storage. Published to both iOS and Android stores.',
        specialtyName: 'App Development',
        skillNames: ['React Native', 'JavaScript', 'Redux', 'Firebase', 'API Integration'],
        budget: { type: 'fixed', amount: 3500 },
        duration: { value: 3, unit: 'months' },
        rating: { score: 5, comment: 'Exceptional developer! App works perfectly on both platforms.' }
    },
    {
        title: 'Social Media Marketing Campaign',
        description: 'Created and managed social media marketing campaign across Facebook, Instagram, and Twitter. Increased engagement by 200% and gained 5000+ new followers.',
        specialtyName: 'Social Media Marketing',
        skillNames: ['Social Media Marketing', 'Content Creation', 'Facebook Ads', 'Instagram Marketing'],
        budget: { type: 'hourly', amount: 20 },
        duration: { value: 4, unit: 'weeks' },
        rating: { score: 4.5, comment: 'Very creative and results-driven!' }
    },
    {
        title: 'Logo and Brand Identity Design',
        description: 'Designed complete brand identity including logo, color palette, typography, and brand guidelines. Delivered multiple concepts and revisions.',
        specialtyName: 'Logo Design',
        skillNames: ['Logo Design', 'Illustrator', 'Photoshop', 'Brand Identity', 'Typography'],
        budget: { type: 'fixed', amount: 500 },
        duration: { value: 2, unit: 'weeks' },
        rating: { score: 5, comment: 'Amazing designer! Captured our vision perfectly.' }
    },
    {
        title: 'Backend API Development with Node.js',
        description: 'Developed RESTful API with Node.js, Express, and MongoDB. Implemented authentication, authorization, and data validation. Wrote comprehensive API documentation.',
        specialtyName: 'Website Programming',
        skillNames: ['Node.js', 'Express', 'MongoDB', 'REST API', 'JWT Authentication'],
        budget: { type: 'hourly', amount: 30 },
        duration: { value: 6, unit: 'weeks' },
        rating: { score: 4.5, comment: 'Solid backend work with clean code.' }
    },
    {
        title: 'Machine Learning Model for Price Prediction',
        description: 'Built machine learning model using Python and scikit-learn to predict house prices. Achieved 92% accuracy with proper feature engineering and model tuning.',
        specialtyName: 'Programming',
        skillNames: ['Python', 'Machine Learning', 'scikit-learn', 'Data Analysis', 'TensorFlow'],
        budget: { type: 'fixed', amount: 2000 },
        duration: { value: 1, unit: 'months' },
        rating: { score: 5, comment: 'Brilliant work! Model performs excellently.' }
    },
    {
        title: 'Android App Development',
        description: 'Created beautiful mobile app using Flutter framework. Implemented real-time chat, user profiles, and location services. Smooth animations and great UX.',
        specialtyName: 'Android Development',
        skillNames: ['Flutter', 'Dart', 'Firebase', 'Mobile Design', 'State Management'],
        budget: { type: 'fixed', amount: 3000 },
        duration: { value: 2, unit: 'months' },
        rating: { score: 4, comment: 'Good app with nice UI. Minor bugs fixed quickly.' }
    },
    {
        title: 'Video Editing for YouTube Channel',
        description: 'Edited 10 YouTube videos with professional transitions, color grading, sound design, and motion graphics. Increased viewer retention significantly.',
        specialtyName: 'Video Production',
        skillNames: ['Premiere Pro', 'After Effects', 'Color Grading', 'Sound Design', 'Motion Graphics'],
        budget: { type: 'hourly', amount: 35 },
        duration: { value: 2, unit: 'weeks' },
        rating: { score: 5, comment: 'Incredible editing skills! Videos look professional.' }
    }
];

async function addCompletedJobsWithRatings() {
    try {
        console.log('🚀 Starting to add completed jobs with ratings...\n');

        // Get all users (they can be both clients and freelancers)
        const allUsers = await User.find({ role: 'user' });

        console.log(`📊 Found ${allUsers.length} users in database`);

        if (allUsers.length < 2) {
            console.error('❌ Need at least 2 users in database!');
            console.log('\n💡 Please run: node scripts/add-test-users.js first\n');
            process.exit(1);
        }

        // Split users into clients and freelancers
        const clients = allUsers.slice(0, Math.ceil(allUsers.length / 2));
        const freelancers = allUsers.slice(Math.ceil(allUsers.length / 2));

        console.log(`✅ Using ${clients.length} users as clients and ${freelancers.length} users as freelancers\n`);

        let addedCount = 0;
        let skippedCount = 0;

        for (const jobData of completedJobsData) {
            try {
                // Get random client and freelancer
                const randomClient = clients[Math.floor(Math.random() * clients.length)];
                const randomFreelancer = freelancers[Math.floor(Math.random() * freelancers.length)];

                // Find specialty
                const specialty = await Specialties.findOne({ name: new RegExp(jobData.specialtyName, 'i') });
                if (!specialty) {
                    console.log(`⚠️ Specialty "${jobData.specialtyName}" not found, skipping...`);
                    skippedCount++;
                    continue;
                }

                // Find skills
                const skills = await Skills.find({ 
                    name: { $in: jobData.skillNames.map(name => new RegExp(name, 'i')) }
                });

                // Generate embedding for job
                const embeddingText = `${jobData.title} ${jobData.description} ${jobData.skillNames.join(' ')}`;
                console.log(`📝 Generating embedding for: "${jobData.title}"...`);
                const embedding = await generateEmbedding(embeddingText);

                if (!embedding) {
                    console.log(`⚠️ Failed to generate embedding for "${jobData.title}", skipping...`);
                    skippedCount++;
                    continue;
                }

                // Create completed job
                const newJob = new Job({
                    client: randomClient._id,
                    freelancer: randomFreelancer._id,
                    title: jobData.title,
                    description: jobData.description,
                    specialty: specialty._id,
                    skills: skills.map(s => s._id),
                    budget: jobData.budget,
                    duration: jobData.duration,
                    status: 'completed',
                    embedding: embedding,
                    rating: jobData.rating,
                    completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
                    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) // Random date within last 60 days
                });

                await newJob.save();
                addedCount++;

                console.log(`✅ Added: "${jobData.title}"`);
                console.log(`   Client: ${randomClient.first_name} ${randomClient.last_name}`);
                console.log(`   Freelancer: ${randomFreelancer.first_name} ${randomFreelancer.last_name}`);
                console.log(`   Rating: ${jobData.rating.score}/5`);
                console.log(`   Budget: $${jobData.budget}`);
                console.log(`   Embedding length: ${embedding.length}\n`);

            } catch (error) {
                console.error(`❌ Error adding job "${jobData.title}":`, error.message);
                skippedCount++;
            }
        }

        console.log('\n✅ ========== SUMMARY ==========');
        console.log(`✅ Successfully added: ${addedCount} jobs`);
        console.log(`⚠️ Skipped: ${skippedCount} jobs`);
        console.log('================================\n');

        // Verify jobs in database
        const totalCompletedJobs = await Job.countDocuments({ status: 'completed', rating: { $exists: true } });
        console.log(`📊 Total completed jobs with ratings in database: ${totalCompletedJobs}`);

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Run the script
addCompletedJobsWithRatings();
