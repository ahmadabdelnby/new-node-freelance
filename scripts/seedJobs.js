const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('../Models/Jobs');
const User = require('../Models/User');
const Specialty = require('../Models/Specialties');
const Skill = require('../Models/Skills');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

// Job title templates by specialty type
const jobTitleTemplates = {
    programming: [
        'Build a {tech} Website',
        'Develop {tech} Application',
        'Create {tech} Web App',
        '{tech} Developer Needed',
        'Fix Bugs in {tech} Project',
        'Implement {tech} Feature',
        'Integrate {tech} API',
        'Custom {tech} Development',
        'Upgrade {tech} System',
        '{tech} Project Completion'
    ],
    design: [
        'Design Modern Logo',
        'Create Brand Identity',
        'Design Website UI/UX',
        'Create Social Media Graphics',
        'Design Marketing Materials',
        'Video Editing Project',
        'Motion Graphics Animation',
        'Product Photography Editing',
        'Create Infographic Design',
        'Design Mobile App Interface'
    ],
    marketing: [
        'Social Media Marketing Campaign',
        'SEO Optimization for Website',
        'Create Content Marketing Strategy',
        'Run Facebook Ads Campaign',
        'Instagram Marketing Management',
        'Email Marketing Campaign',
        'Google Ads Management',
        'Brand Awareness Campaign',
        'Influencer Marketing Strategy',
        'Marketing Analytics Report'
    ],
    writing: [
        'Write Blog Articles',
        'Content Writing for Website',
        'Copywriting for Landing Page',
        'Translate Documents',
        'Proofread and Edit Content',
        'Write Product Descriptions',
        'Create SEO Content',
        'Technical Writing Project',
        'Write Business Plan',
        'Creative Writing Project'
    ],
    training: [
        'Online English Tutoring',
        'Create E-Learning Course',
        'Math Tutoring for Students',
        'Develop Training Materials',
        'Design Educational Videos',
        'Create Course Curriculum',
        'Test Preparation Coaching',
        'Language Teaching Sessions',
        'Corporate Training Program',
        'Online Workshop Development'
    ],
    support: [
        'Data Entry Project',
        'Virtual Assistant Needed',
        'Customer Support Service',
        'Excel Data Management',
        'CRM Data Migration',
        'Email Management Support',
        'Product Listing Task',
        'Online Research Project',
        'Administrative Support',
        'Data Processing Task'
    ],
    architecture: [
        'Architectural Design Project',
        'Interior Design for Home',
        'AutoCAD Drawings Needed',
        '3D Architectural Rendering',
        'Building Design Plans',
        'Civil Engineering Consultation',
        'Structural Design Project',
        'Landscape Design Plans',
        'Renovation Design Project',
        'Commercial Space Design'
    ],
    business: [
        'Business Plan Development',
        'Financial Analysis Report',
        'Accounting Services Needed',
        'Market Research Project',
        'Business Consulting Needed',
        'Project Management Support',
        'HR Consulting Services',
        'Financial Modeling Project',
        'Business Strategy Development',
        'Investment Analysis Report'
    ]
};

// Job description templates
const descriptionTemplates = [
    "I'm looking for an experienced professional to help with {task}. The project requires {skills} and should be completed within {duration}. Please provide examples of your previous work.",
    "We need a skilled freelancer to {task}. This is a {duration} project with a budget of ${budget}. Must have experience with {skills}.",
    "Seeking a talented individual to {task}. The ideal candidate should have expertise in {skills} and be able to deliver high-quality results within {duration}.",
    "I need help with {task}. Looking for someone with strong {skills} skills who can start immediately. Project duration is approximately {duration}.",
    "We're looking for a professional to {task}. This project requires {skills} knowledge and attention to detail. Timeline: {duration}.",
    "Looking for an expert to {task}. Must be proficient in {skills} and have a portfolio of similar work. Budget is ${budget} for {duration} of work.",
    "I need a freelancer to {task}. Requirements include {skills} and the ability to meet tight deadlines. Expected completion: {duration}.",
    "Seeking a qualified professional for {task}. The project involves {skills} and requires excellent communication. Duration: {duration}."
];

const technologies = [
    'React', 'Node.js', 'PHP', 'WordPress', 'Python', 'JavaScript', 
    'Vue.js', 'Angular', 'Laravel', 'Django', 'Flutter', 'React Native'
];

// Generate random date between start and end
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate random integer
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick random item
function randomPick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Get job category based on specialty name
function getJobCategory(specialtyName) {
    const name = specialtyName.toLowerCase();
    if (/(program|development|code|website|app|software|php|javascript|python|wordpress)/i.test(name)) return 'programming';
    if (/(design|logo|graphic|video|photo|illustrator|ui|ux|motion)/i.test(name)) return 'design';
    if (/(marketing|seo|social|ads|campaign|brand)/i.test(name)) return 'marketing';
    if (/(writing|content|copy|translate|proofread|article)/i.test(name)) return 'writing';
    if (/(training|teaching|tutor|education|course)/i.test(name)) return 'training';
    if (/(data|support|assistant|crm|excel|research)/i.test(name)) return 'support';
    if (/(architect|interior|autocad|engineering|civil|structural)/i.test(name)) return 'architecture';
    return 'business';
}

// Generate job title
function generateJobTitle(specialty) {
    const category = getJobCategory(specialty.name);
    const templates = jobTitleTemplates[category] || jobTitleTemplates.business;
    let title = randomPick(templates);
    
    if (category === 'programming' && title.includes('{tech}')) {
        title = title.replace(/{tech}/g, randomPick(technologies));
    }
    
    return title;
}

// Generate job description
function generateJobDescription(title, specialty, skills, budget, duration) {
    const category = getJobCategory(specialty.name);
    const template = randomPick(descriptionTemplates);
    
    const skillNames = skills.map(s => s.name).join(', ');
    const task = title.toLowerCase().replace(/^(build|create|develop|design|write|need|seeking|looking)\s+/i, '');
    
    return template
        .replace('{task}', task)
        .replace('{skills}', skillNames || specialty.name)
        .replace('{duration}', `${duration.value} ${duration.unit}`)
        .replace('${budget}', budget.amount);
}

async function seedJobs() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users (clients)
        const users = await User.find({ role: 'user' });
        const specialties = await Specialty.find({ isActive: true });
        
        if (users.length === 0) {
            console.log('❌ No users found. Please seed users first.');
            process.exit(1);
        }

        if (specialties.length === 0) {
            console.log('❌ No specialties found. Please seed specialties first.');
            process.exit(1);
        }

        console.log(`📊 Found ${users.length} users and ${specialties.length} specialties`);

        const startDate = new Date('2023-01-01');
        const endDate = new Date('2025-12-31');
        
        const numberOfJobs = 150; // Create 150 jobs
        const jobs = [];

        for (let i = 0; i < numberOfJobs; i++) {
            // Pick random client
            const client = randomPick(users);
            
            // Pick random specialty
            const specialty = randomPick(specialties);
            
            // Get 2-4 skills for this specialty
            const specialtySkills = await Skill.find({ specialty: specialty._id })
                .limit(randomInt(2, 4));
            
            // Budget type and amount
            const budgetType = Math.random() > 0.5 ? 'fixed' : 'hourly';
            const budgetAmount = budgetType === 'fixed' 
                ? randomInt(100, 5000) 
                : randomInt(10, 100);
            
            // Duration
            const durationUnits = ['days', 'weeks', 'months'];
            const durationUnit = randomPick(durationUnits);
            let durationValue;
            
            if (durationUnit === 'days') durationValue = randomInt(1, 30);
            else if (durationUnit === 'weeks') durationValue = randomInt(1, 12);
            else durationValue = randomInt(1, 6);
            
            const duration = { value: durationValue, unit: durationUnit };
            
            // Generate title and description
            const title = generateJobTitle(specialty);
            const description = generateJobDescription(
                title, 
                specialty, 
                specialtySkills, 
                { amount: budgetAmount }, 
                duration
            );
            
            // Status distribution: 60% open, 20% in_progress, 15% completed, 5% cancelled
            const statusRand = Math.random();
            let status;
            if (statusRand < 0.60) status = 'open';
            else if (statusRand < 0.80) status = 'in_progress';
            else if (statusRand < 0.95) status = 'completed';
            else status = 'cancelled';
            
            // Created date
            const createdAt = randomDate(startDate, endDate);
            
            // Deadline (1-90 days from creation)
            const deadline = new Date(createdAt);
            deadline.setDate(deadline.getDate() + randomInt(7, 90));
            
            // Closed date for completed/cancelled jobs
            let closedAt = null;
            if (status === 'completed' || status === 'cancelled') {
                closedAt = randomDate(createdAt, new Date());
            }
            
            const job = {
                client: client._id,
                title,
                description,
                specialty: specialty._id,
                skills: specialtySkills.map(s => s._id),
                budget: {
                    type: budgetType,
                    amount: budgetAmount
                },
                status,
                deadline,
                duration,
                proposalsCount: status === 'open' ? randomInt(0, 30) : randomInt(5, 50),
                views: randomInt(10, 500),
                visibility: 'public',
                featured: Math.random() > 0.9, // 10% featured
                closedAt,
                createdAt,
                updatedAt: closedAt || createdAt
            };

            jobs.push(job);
        }

        // Sort jobs by creation date to maintain chronological order
        jobs.sort((a, b) => a.createdAt - b.createdAt);

        // Insert jobs
        let insertedCount = 0;
        
        try {
            const result = await Job.insertMany(jobs, { ordered: false });
            insertedCount = result.length;
        } catch (error) {
            if (error.code === 11000) {
                insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
            } else {
                throw error;
            }
        }

        console.log(`✅ Jobs: ${insertedCount} inserted`);
        console.log(`📊 Date range: 2023-01-01 to 2025-12-31`);
        console.log(`📈 Status distribution:`);
        console.log(`   - Open: ${jobs.filter(j => j.status === 'open').length}`);
        console.log(`   - In Progress: ${jobs.filter(j => j.status === 'in_progress').length}`);
        console.log(`   - Completed: ${jobs.filter(j => j.status === 'completed').length}`);
        console.log(`   - Cancelled: ${jobs.filter(j => j.status === 'cancelled').length}`);
        console.log('✅ Jobs seeded successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding jobs:', error);
        process.exit(1);
    }
}

seedJobs();
