const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../Models/User');
const Specialties = require('../Models/Specialties');

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

// Sample users data
const usersData = {
    clients: [
        { first_name: 'Ahmed', last_name: 'Hassan', username: 'ahmed_client', email: 'ahmed.client@test.com', password: 'password123', role: 'user', gender: 'male', country: 'Egypt' },
        { first_name: 'Mohamed', last_name: 'Ali', username: 'mohamed_client', email: 'mohamed.client@test.com', password: 'password123', role: 'user', gender: 'male', country: 'Egypt' },
        { first_name: 'Sarah', last_name: 'Ibrahim', username: 'sarah_client', email: 'sarah.client@test.com', password: 'password123', role: 'user', gender: 'female', country: 'Egypt' },
        { first_name: 'Fatma', last_name: 'Omar', username: 'fatma_client', email: 'fatma.client@test.com', password: 'password123', role: 'user', gender: 'female', country: 'Egypt' },
        { first_name: 'Khaled', last_name: 'Mahmoud', username: 'khaled_client', email: 'khaled.client@test.com', password: 'password123', role: 'user', gender: 'male', country: 'Egypt' }
    ],
    freelancers: [
        { 
            first_name: 'Omar', 
            last_name: 'Youssef', 
            username: 'omar_dev',
            email: 'omar.dev@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'male',
            country: 'Egypt',
            aboutMe: 'Full-stack developer with 5 years of experience in building web applications using modern technologies',
            hourlyRate: 25,
            specialtyName: 'Web Development'
        },
        { 
            first_name: 'Nour', 
            last_name: 'Ahmed', 
            username: 'nour_designer',
            email: 'nour.designer@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'female',
            country: 'Egypt',
            aboutMe: 'Creative UI/UX designer passionate about user experience and creating beautiful interfaces',
            hourlyRate: 20,
            specialtyName: 'UI/UX Design'
        },
        { 
            first_name: 'Hassan', 
            last_name: 'Mohamed', 
            username: 'hassan_data',
            email: 'hassan.data@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'male',
            country: 'Egypt',
            aboutMe: 'Data scientist specializing in machine learning and artificial intelligence projects',
            hourlyRate: 30,
            specialtyName: 'Data Science'
        },
        { 
            first_name: 'Mariam', 
            last_name: 'Said', 
            username: 'mariam_marketing',
            email: 'mariam.marketing@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'female',
            country: 'Egypt',
            aboutMe: 'Digital marketing expert with proven track record in social media and content marketing',
            hourlyRate: 18,
            specialtyName: 'Digital Marketing'
        },
        { 
            first_name: 'Youssef', 
            last_name: 'Khaled', 
            username: 'youssef_mobile',
            email: 'youssef.mobile@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'male',
            country: 'Egypt',
            aboutMe: 'Mobile app developer specializing in iOS and Android native and cross-platform development',
            hourlyRate: 28,
            specialtyName: 'Mobile Development'
        },
        { 
            first_name: 'Aya', 
            last_name: 'Tarek', 
            username: 'aya_graphic',
            email: 'aya.graphic@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'female',
            country: 'Egypt',
            aboutMe: 'Graphic designer with keen eye for detail and passion for creating stunning visual designs',
            hourlyRate: 15,
            specialtyName: 'Graphic Design'
        },
        { 
            first_name: 'Mahmoud', 
            last_name: 'Fathy', 
            username: 'mahmoud_backend',
            email: 'mahmoud.backend@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'male',
            country: 'Egypt',
            aboutMe: 'Backend developer specializing in Node.js, Express, and database design and optimization',
            hourlyRate: 27,
            specialtyName: 'Web Development'
        },
        { 
            first_name: 'Mona', 
            last_name: 'Hossam', 
            username: 'mona_content',
            email: 'mona.content@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'female',
            country: 'Egypt',
            aboutMe: 'Professional content writer and copywriter with expertise in SEO and engaging content creation',
            hourlyRate: 12,
            specialtyName: 'Content Writing'
        },
        { 
            first_name: 'Karim', 
            last_name: 'Adel', 
            username: 'karim_frontend',
            email: 'karim.frontend@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'male',
            country: 'Egypt',
            aboutMe: 'Frontend developer specializing in React, Vue, and modern JavaScript frameworks and libraries',
            hourlyRate: 24,
            specialtyName: 'Web Development'
        },
        { 
            first_name: 'Salma', 
            last_name: 'Nasser', 
            username: 'salma_video',
            email: 'salma.video@test.com', 
            password: 'password123', 
            role: 'user',
            gender: 'female',
            country: 'Egypt',
            aboutMe: 'Professional video editor and motion graphics designer creating stunning visual content',
            hourlyRate: 22,
            specialtyName: 'Video Editing'
        }
    ]
};

async function addTestUsers() {
    try {
        console.log('🚀 Starting to add test users...\n');

        let clientsAdded = 0;
        let freelancersAdded = 0;
        let skipped = 0;

        // Add clients
        console.log('👥 Adding clients...');
        for (const clientData of usersData.clients) {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ email: clientData.email });
                if (existingUser) {
                    console.log(`⚠️ Client already exists: ${clientData.email}`);
                    skipped++;
                    continue;
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(clientData.password, 10);

                // Create client
                const newClient = new User({
                    first_name: clientData.first_name,
                    last_name: clientData.last_name,
                    username: clientData.username,
                    email: clientData.email,
                    password: hashedPassword,
                    confirmPassword: hashedPassword,
                    role: 'user',
                    gender: clientData.gender,
                    country: clientData.country,
                    isEmailVerified: true
                });

                await newClient.save();
                clientsAdded++;
                console.log(`✅ Added client: ${clientData.first_name} ${clientData.last_name} (${clientData.email})`);

            } catch (error) {
                console.error(`❌ Error adding client ${clientData.email}:`, error.message);
            }
        }

        // Add freelancers
        console.log('\n💼 Adding freelancers...');
        for (const freelancerData of usersData.freelancers) {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ email: freelancerData.email });
                if (existingUser) {
                    console.log(`⚠️ Freelancer already exists: ${freelancerData.email}`);
                    skipped++;
                    continue;
                }

                // Find specialty if provided
                let specialtyId = null;
                if (freelancerData.specialtyName) {
                    const specialty = await Specialties.findOne({ 
                        name: new RegExp(freelancerData.specialtyName, 'i') 
                    });
                    if (specialty) {
                        specialtyId = specialty._id;
                    }
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(freelancerData.password, 10);

                // Create freelancer
                const newFreelancer = new User({
                    first_name: freelancerData.first_name,
                    last_name: freelancerData.last_name,
                    username: freelancerData.username,
                    email: freelancerData.email,
                    password: hashedPassword,
                    confirmPassword: hashedPassword,
                    role: 'user',
                    gender: freelancerData.gender,
                    country: freelancerData.country,
                    aboutMe: freelancerData.aboutMe,
                    hourlyRate: freelancerData.hourlyRate,
                    specialty: specialtyId,
                    isEmailVerified: true
                });

                await newFreelancer.save();
                freelancersAdded++;
                console.log(`✅ Added freelancer: ${freelancerData.first_name} ${freelancerData.last_name} (${freelancerData.email})`);
                console.log(`   Specialty: ${freelancerData.specialtyName || 'N/A'}, Rate: $${freelancerData.hourlyRate}/hr`);

            } catch (error) {
                console.error(`❌ Error adding freelancer ${freelancerData.email}:`, error.message);
            }
        }

        console.log('\n✅ ========== SUMMARY ==========');
        console.log(`✅ Clients added: ${clientsAdded}`);
        console.log(`✅ Freelancers added: ${freelancersAdded}`);
        console.log(`⚠️ Skipped (already exist): ${skipped}`);
        console.log('================================\n');

        // Verify users in database
        const totalClients = await User.countDocuments({ role: 'user' });
        console.log(`📊 Total users in database: ${totalClients}`);

        console.log('\n💡 Default password for all test users: password123');
        console.log('💡 You can now run the completed jobs script!\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        mongoose.connection.close();
        console.log('👋 Database connection closed');
    }
}

// Run the script
addTestUsers();
