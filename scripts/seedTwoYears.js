/**
 * Comprehensive Database Seeding Script for 2 Years of Data
 * Creates realistic data distributed across 24 months
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../Models/User');
const Job = require('../Models/Jobs');
const Proposal = require('../Models/proposals');
const Contract = require('../Models/Contract');
const Payment = require('../Models/Payment');
const Category = require('../Models/Categories');
const Specialty = require('../Models/Specialties');
const Skill = require('../Models/Skills');
const Country = require('../Models/Country');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected for Seeding'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

// Helper function to generate random date within last 2 years
function randomDate(monthsAgo) {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(Math.floor(Math.random() * 28) + 1);
    date.setHours(Math.floor(Math.random() * 24));
    return date;
}

// Helper function to generate random amount
function randomAmount(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sample data
const firstNames = ['Ahmed', 'Mohamed', 'Ali', 'Omar', 'Khaled', 'Youssef', 'Hassan', 'Mahmoud', 'Sarah', 'Fatima', 'Laila', 'Nour', 'Hala', 'Mona', 'Rania', 'Dina'];
const lastNames = ['Hassan', 'Ibrahim', 'Mahmoud', 'Ali', 'Mohamed', 'Youssef', 'Khaled', 'Omar', 'Salem', 'Farouk'];

const jobTitles = [
    'Full Stack Developer',
    'Mobile App Development',
    'UI/UX Design',
    'WordPress Website',
    'E-commerce Platform',
    'Logo Design',
    'Digital Marketing Campaign',
    'Content Writing',
    'Video Editing',
    'SEO Optimization',
    'React Native App',
    'Backend API Development',
    'Database Design',
    'Cloud Infrastructure Setup'
];

const jobDescriptions = [
    'Looking for an experienced developer to build a modern web application with advanced features and responsive design.',
    'Need a skilled professional to create a mobile application for both iOS and Android platforms with clean UI.',
    'Seeking a creative designer to design user interface and experience for our new product launch.',
    'Require a developer to build and customize a WordPress website with e-commerce functionality.',
    'Looking for an expert to develop a complete e-commerce solution with payment gateway integration.',
    'Need a talented designer to create a unique and memorable logo for our startup company.',
    'Seeking a digital marketing specialist to run comprehensive campaigns across social media platforms.',
    'Looking for a professional content writer to create engaging articles and blog posts.',
    'Need a video editor to create professional promotional videos for our marketing campaigns.',
    'Require an SEO expert to optimize our website and improve search engine rankings.'
];

async function clearDatabase() {
    console.log('🗑️  Clearing existing data...');
    
    // Delete in correct order (dependencies first)
    await Payment.deleteMany({});
    await Contract.deleteMany({});
    await Proposal.deleteMany({});
    await Job.deleteMany({});
    await User.deleteMany({});
    await Specialty.deleteMany({});
    await Skill.deleteMany({});
    await Category.deleteMany({});
    await Country.deleteMany({});
    
    console.log('✅ Database cleared');
}

async function seedCategories() {
    console.log('📂 Seeding Categories...');
    
    const categories = [
        { name: 'Web Development', description: 'Web development and design services' },
        { name: 'Mobile Development', description: 'Mobile app development for iOS and Android' },
        { name: 'Design', description: 'Graphic design and creative services' },
        { name: 'Marketing', description: 'Digital marketing and SEO services' },
        { name: 'Writing', description: 'Content writing and copywriting' },
        { name: 'Video & Animation', description: 'Video editing and animation services' }
    ];

    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);
    return createdCategories;
}

async function seedSpecialties(categories) {
    console.log('🎯 Seeding Specialties...');
    
    const specialties = [
        { name: 'Frontend Development', description: 'Building user interfaces and client-side applications', Category: categories[0]._id },
        { name: 'Backend Development', description: 'Server-side development and API creation', Category: categories[0]._id },
        { name: 'Full Stack Development', description: 'Complete web application development', Category: categories[0]._id },
        { name: 'iOS Development', description: 'Native iOS mobile applications', Category: categories[1]._id },
        { name: 'Android Development', description: 'Native Android mobile applications', Category: categories[1]._id },
        { name: 'React Native', description: 'Cross-platform mobile development', Category: categories[1]._id },
        { name: 'UI/UX Design', description: 'User interface and experience design', Category: categories[2]._id },
        { name: 'Logo Design', description: 'Brand identity and logo creation', Category: categories[2]._id },
        { name: 'Graphic Design', description: 'Visual design and graphics', Category: categories[2]._id },
        { name: 'SEO', description: 'Search engine optimization services', Category: categories[3]._id },
        { name: 'Social Media Marketing', description: 'Social media campaigns and management', Category: categories[3]._id },
        { name: 'Content Writing', description: 'Article and blog post writing', Category: categories[4]._id },
        { name: 'Video Editing', description: 'Professional video editing services', Category: categories[5]._id }
    ];

    const createdSpecialties = await Specialty.insertMany(specialties);
    console.log(`✅ Created ${createdSpecialties.length} specialties`);
    return createdSpecialties;
}

async function seedSkills(specialties) {
    console.log('💼 Seeding Skills...');
    
    // Map skills to specialties (using array indices from seedSpecialties function)
    const skills = [
        // Frontend Development skills (specialty[0])
        { name: 'JavaScript', description: 'Core web programming language', specialty: specialties[0]._id },
        { name: 'React', description: 'Popular JavaScript framework', specialty: specialties[0]._id },
        { name: 'Angular', description: 'TypeScript-based framework', specialty: specialties[0]._id },
        { name: 'Vue.js', description: 'Progressive JavaScript framework', specialty: specialties[0]._id },
        { name: 'HTML', description: 'Markup language for web pages', specialty: specialties[0]._id },
        { name: 'CSS', description: 'Styling language for web pages', specialty: specialties[0]._id },
        { name: 'Bootstrap', description: 'CSS framework', specialty: specialties[0]._id },
        { name: 'Tailwind', description: 'Utility-first CSS framework', specialty: specialties[0]._id },
        
        // Backend Development skills (specialty[1])
        { name: 'Node.js', description: 'JavaScript runtime', specialty: specialties[1]._id },
        { name: 'Express', description: 'Node.js web framework', specialty: specialties[1]._id },
        { name: 'Python', description: 'General-purpose programming', specialty: specialties[1]._id },
        { name: 'Django', description: 'Python web framework', specialty: specialties[1]._id },
        { name: 'PHP', description: 'Server-side scripting', specialty: specialties[1]._id },
        { name: 'Laravel', description: 'PHP web framework', specialty: specialties[1]._id },
        { name: 'MongoDB', description: 'NoSQL database', specialty: specialties[1]._id },
        { name: 'MySQL', description: 'Relational database', specialty: specialties[1]._id },
        { name: 'PostgreSQL', description: 'Advanced relational database', specialty: specialties[1]._id },
        
        // Mobile Development skills (iOS specialty[3], Android specialty[4], React Native specialty[5])
        { name: 'Swift', description: 'iOS programming language', specialty: specialties[3]._id },
        { name: 'Kotlin', description: 'Android programming language', specialty: specialties[4]._id },
        { name: 'React Native', description: 'Cross-platform mobile development with React', specialty: specialties[5]._id },
        { name: 'Flutter', description: 'Cross-platform mobile framework by Google', specialty: specialties[5]._id },
        
        // UI/UX Design skills (specialty[6])
        { name: 'Figma', description: 'UI design tool', specialty: specialties[6]._id },
        { name: 'Adobe XD', description: 'UI/UX design tool', specialty: specialties[6]._id },
        { name: 'Photoshop', description: 'Image editing software', specialty: specialties[8]._id },
        { name: 'Illustrator', description: 'Vector graphics editor', specialty: specialties[7]._id },
        
        // Marketing skills (SEO specialty[9], Social Media specialty[10])
        { name: 'SEO', description: 'Search engine optimization', specialty: specialties[9]._id },
        { name: 'Google Analytics', description: 'Web analytics service', specialty: specialties[9]._id },
        { name: 'Facebook Ads', description: 'Social media advertising', specialty: specialties[10]._id },
        { name: 'Google Ads', description: 'Online advertising platform', specialty: specialties[10]._id },
        
        // Content Writing skills (specialty[11])
        { name: 'Content Writing', description: 'Creating written content', specialty: specialties[11]._id },
        { name: 'Copywriting', description: 'Marketing and advertising copy', specialty: specialties[11]._id },
        { name: 'Technical Writing', description: 'Technical documentation', specialty: specialties[11]._id },
        
        // Video Editing skills (specialty[12])
        { name: 'Premiere Pro', description: 'Adobe video editing software', specialty: specialties[12]._id },
        { name: 'After Effects', description: 'Motion graphics software', specialty: specialties[12]._id },
        { name: 'Final Cut Pro', description: 'Apple professional video editing', specialty: specialties[12]._id }
    ];

    const createdSkills = await Skill.insertMany(skills);
    console.log(`✅ Created ${createdSkills.length} skills`);
    return createdSkills;
}

async function seedCountries() {
    console.log('🌍 Seeding Countries...');
    
    const countries = [
        { name: 'Egypt', code: 'EG' },
        { name: 'Saudi Arabia', code: 'SA' },
        { name: 'United Arab Emirates', code: 'AE' },
        { name: 'Jordan', code: 'JO' },
        { name: 'Lebanon', code: 'LB' },
        { name: 'Morocco', code: 'MA' }
    ];

    const createdCountries = await Country.insertMany(countries);
    console.log(`✅ Created ${createdCountries.length} countries`);
    return createdCountries;
}

async function seedUsers(countries, specialties, skills) {
    console.log('👥 Seeding Users (distributed over 24 months)...');
    
    const users = [];
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    
    // Create 1 admin
    users.push({
        email: 'admin@freelance.com',
        username: 'admin',
        password: hashedPassword,
        confirmPassword: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        gender: 'male',
        birthdate: new Date('1990-01-01'),
        role: 'admin',
        country: countries[0]._id,
        createdAt: randomDate(24)
    });

    // Create 200 users distributed over 24 months
    for (let i = 0; i < 200; i++) {
        const monthsAgo = Math.floor(Math.random() * 24);
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
        
        users.push({
            email: `${username}@example.com`,
            username: username,
            password: hashedPassword,
            confirmPassword: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            gender: Math.random() > 0.5 ? 'male' : 'female',
            birthdate: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
            role: 'user',
            country: countries[Math.floor(Math.random() * countries.length)]._id,
            title: specialties[Math.floor(Math.random() * specialties.length)].name,
            bio: `Experienced professional with ${Math.floor(Math.random() * 10) + 1} years of experience.`,
            hourly_rate: randomAmount(10, 100),
            skills: skills.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 8) + 3).map(s => s._id),
            isVerified: Math.random() > 0.3,
            balance: randomAmount(0, 5000),
            createdAt: randomDate(monthsAgo),
            updatedAt: randomDate(Math.max(0, monthsAgo - 1))
        });
    }

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users`);
    return createdUsers;
}

async function seedJobs(users, specialties, skills) {
    console.log('💼 Seeding Jobs (distributed over 24 months)...');
    
    const jobs = [];
    const clients = users.filter(u => u.role === 'user').slice(0, 50); // First 50 users as clients
    const statuses = ['open', 'in_progress', 'completed', 'cancelled'];
    
    // Create 300 jobs distributed over 24 months
    for (let i = 0; i < 300; i++) {
        const monthsAgo = Math.floor(Math.random() * 24);
        const createdAt = randomDate(monthsAgo);
        const status = monthsAgo < 2 ? 'open' : statuses[Math.floor(Math.random() * statuses.length)];
        
        jobs.push({
            client: clients[Math.floor(Math.random() * clients.length)]._id,
            title: jobTitles[Math.floor(Math.random() * jobTitles.length)],
            description: jobDescriptions[Math.floor(Math.random() * jobDescriptions.length)],
            specialty: specialties[Math.floor(Math.random() * specialties.length)]._id,
            skills: skills.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5) + 2).map(s => s._id),
            budget: {
                type: Math.random() > 0.5 ? 'fixed' : 'hourly',
                amount: randomAmount(500, 5000)
            },
            status: status,
            duration: {
                value: randomAmount(1, 12),
                unit: ['days', 'weeks', 'months'][Math.floor(Math.random() * 3)]
            },
            proposalsCount: randomAmount(0, 20),
            views: randomAmount(10, 500),
            visibility: 'public',
            featured: Math.random() > 0.8,
            createdAt: createdAt,
            updatedAt: new Date(createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000),
            closedAt: status === 'completed' || status === 'cancelled' ? new Date(createdAt.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000) : null
        });
    }

    const createdJobs = await Job.insertMany(jobs);
    console.log(`✅ Created ${createdJobs.length} jobs`);
    return createdJobs;
}

async function seedProposals(users, jobs) {
    console.log('📝 Seeding Proposals...');
    
    const proposals = [];
    const freelancers = users.filter(u => u.role === 'user').slice(50, 150); // Different set as freelancers
    const statuses = ['submitted', 'accepted', 'rejected'];
    const usedCombinations = new Set(); // Track job_id + freelancer_id combinations
    
    // Create 500 proposals (with unique job+freelancer combinations)
    let attempts = 0;
    while (proposals.length < 500 && attempts < 1000) {
        attempts++;
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const freelancer = freelancers[Math.floor(Math.random() * freelancers.length)];
        const combination = `${job._id}-${freelancer._id}`;
        
        // Skip if this freelancer already proposed to this job
        if (usedCombinations.has(combination)) {
            continue;
        }
        
        usedCombinations.add(combination);
        const jobCreatedAt = new Date(job.createdAt);
        const proposalDate = new Date(jobCreatedAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000);
        
        proposals.push({
            job_id: job._id,
            freelancer_id: freelancer._id,
            coverLetter: 'I am very interested in this project and have the required skills to complete it successfully. With my extensive experience and proven track record, I am confident I can deliver exceptional results.',
            bidAmount: randomAmount(job.budget.amount * 0.7, job.budget.amount * 1.3),
            deliveryTime: randomAmount(3, 30),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            createdAt: proposalDate,
            updatedAt: new Date(proposalDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000)
        });
    }

    const createdProposals = await Proposal.insertMany(proposals);
    console.log(`✅ Created ${createdProposals.length} proposals`);
    return createdProposals;
}

async function seedContracts(users, jobs, proposals) {
    console.log('📄 Seeding Contracts...');
    
    const contracts = [];
    const acceptedProposals = proposals.filter(p => p.status === 'accepted').slice(0, 100);
    const statuses = ['active', 'completed', 'terminated', 'paused'];
    
    for (const proposal of acceptedProposals) {
        const job = jobs.find(j => j._id.equals(proposal.job_id));
        const freelancer = users.find(u => u._id.equals(proposal.freelancer_id));
        const client = users.find(u => u._id.equals(job.client));
        
        const proposalDate = new Date(proposal.createdAt);
        const contractDate = new Date(proposalDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        contracts.push({
            job: job._id,
            client: client._id,
            freelancer: freelancer._id,
            proposal: proposal._id,
            agreedAmount: proposal.bidAmount,
            budgetType: job.budget.type,
            terms: 'Standard contract terms and conditions.',
            status: status,
            milestones: [],
            hours_logged: status === 'completed' ? randomAmount(10, 100) : randomAmount(0, 50),
            createdAt: contractDate,
            updatedAt: new Date(contractDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000),
            startDate: contractDate,
            endDate: status === 'completed' ? new Date(contractDate.getTime() + randomAmount(10, 60) * 24 * 60 * 60 * 1000) : null
        });
    }

    const createdContracts = await Contract.insertMany(contracts);
    console.log(`✅ Created ${createdContracts.length} contracts`);
    return createdContracts;
}

async function seedPayments(contracts, users) {
    console.log('💳 Seeding Payments (distributed over 24 months)...');
    
    const payments = [];
    const completedContracts = contracts.filter(c => c.status === 'completed');
    const statuses = ['pending', 'completed', 'failed'];
    const paymentMethods = ['credit_card', 'paypal', 'bank_transfer', 'wallet'];
    
    for (const contract of completedContracts) {
        const contractDate = new Date(contract.createdAt);
        const paymentDate = new Date(contract.endDate || contractDate.getTime() + randomAmount(10, 60) * 24 * 60 * 60 * 1000);
        const amount = contract.agreedAmount;
        const platformFee = amount * 0.05; // 5% platform fee
        const netAmount = amount - platformFee;
        
        payments.push({
            payer: contract.client,
            payee: contract.freelancer,
            contract: contract._id,
            amount: amount,
            platformFee: platformFee,
            netAmount: netAmount,
            currency: 'USD',
            paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            status: Math.random() > 0.1 ? 'completed' : statuses[Math.floor(Math.random() * statuses.length)],
            transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`,
            createdAt: paymentDate,
            updatedAt: new Date(paymentDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000),
            processedAt: new Date(paymentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000)
        });
    }

    const createdPayments = await Payment.insertMany(payments);
    console.log(`✅ Created ${createdPayments.length} payments`);
    return createdPayments;
}

async function main() {
    try {
        console.log('🚀 Starting 2-Year Data Seeding Process...\n');
        
        await clearDatabase();
        
        const categories = await seedCategories();
        const specialties = await seedSpecialties(categories);
        const skills = await seedSkills(specialties);
        const countries = await seedCountries();
        
        const users = await seedUsers(countries, specialties, skills);
        const jobs = await seedJobs(users, specialties, skills);
        const proposals = await seedProposals(users, jobs);
        const contracts = await seedContracts(users, jobs, proposals);
        const payments = await seedPayments(contracts, users);
        
        console.log('\n✅ ============================================');
        console.log('✅ 2-YEAR DATA SEEDING COMPLETED SUCCESSFULLY!');
        console.log('✅ ============================================');
        console.log(`📊 Total Users: ${users.length}`);
        console.log(`💼 Total Jobs: ${jobs.length}`);
        console.log(`📝 Total Proposals: ${proposals.length}`);
        console.log(`📄 Total Contracts: ${contracts.length}`);
        console.log(`💳 Total Payments: ${payments.length}`);
        console.log(`📂 Total Categories: ${categories.length}`);
        console.log(`🎯 Total Specialties: ${specialties.length}`);
        console.log(`💼 Total Skills: ${skills.length}`);
        console.log(`🌍 Total Countries: ${countries.length}`);
        console.log('✅ ============================================\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Error:', error);
        process.exit(1);
    }
}

main();
