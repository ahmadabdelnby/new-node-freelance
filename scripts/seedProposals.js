const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Proposal = require('../Models/proposals');
const Job = require('../Models/Jobs');
const User = require('../Models/User');
const Specialty = require('../Models/Specialties');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

// Cover letter templates
const coverLetterTemplates = [
    "Hello! I'm very interested in this project. I have {years} years of experience in {specialty} and I've completed similar projects in the past. I can deliver high-quality work within your timeline. I'm confident I can exceed your expectations. Looking forward to working with you!",
    
    "Hi there! I noticed your project and I believe I'm a perfect fit. With my expertise in {specialty} and {years} years of experience, I can help you achieve your goals. I've worked on similar projects and I understand exactly what you need. Let's discuss how I can help!",
    
    "Greetings! I'm a professional {specialty} specialist with {years} years of hands-on experience. I've carefully reviewed your requirements and I'm confident I can deliver exceptional results. My approach focuses on quality and timely delivery. I'd love to be part of your project!",
    
    "Dear Client, I'm excited about this opportunity! I specialize in {specialty} and have {years} years of experience delivering successful projects. I'm committed to providing top-notch service and ensuring your complete satisfaction. Let me help bring your vision to life!",
    
    "Hello! I'm reaching out because I believe I can add significant value to your project. My background in {specialty} spans {years} years, and I've successfully completed numerous similar projects. I'm detail-oriented, professional, and dedicated to excellence.",
    
    "Hi! Your project caught my attention and I'm very interested in working with you. I have {years} years of experience in {specialty} and a proven track record of delivering quality work on time. I'm confident we can create something amazing together!",
    
    "Good day! I'm a skilled {specialty} professional with {years} years of experience. I've reviewed your project requirements and I'm certain I can meet and exceed your expectations. My work ethic is strong and I prioritize client satisfaction above all.",
    
    "Hello! I'm passionate about {specialty} and have been working in this field for {years} years. I've handled projects similar to yours and achieved excellent results. I'm reliable, creative, and committed to delivering work that makes you proud. Let's collaborate!",
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

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Generate cover letter
function generateCoverLetter(specialty, yearsOfExperience) {
    const template = randomPick(coverLetterTemplates);
    return template
        .replace('{specialty}', specialty)
        .replace('{years}', yearsOfExperience);
}

async function seedProposals() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all jobs
        const jobs = await Job.find({})
            .populate('specialty')
            .populate('client');
        
        // Get all freelancers (users who are not the job clients)
        const allUsers = await User.find({ role: 'user' }).populate('specialty');
        
        if (jobs.length === 0) {
            console.log('❌ No jobs found. Please seed jobs first.');
            process.exit(1);
        }

        if (allUsers.length === 0) {
            console.log('❌ No users found. Please seed users first.');
            process.exit(1);
        }

        console.log(`📊 Found ${jobs.length} jobs and ${allUsers.length} users`);

        const proposals = [];
        let totalProposalsToCreate = 0;

        // For each job, create proposals
        for (const job of jobs) {
            // Get freelancers (exclude the job client)
            const eligibleFreelancers = allUsers.filter(user => 
                !user._id.equals(job.client._id)
            );

            if (eligibleFreelancers.length === 0) continue;

            // Determine number of proposals based on job status and proposalsCount
            let numProposals;
            
            if (job.status === 'open') {
                // Open jobs: 0-15 proposals
                numProposals = randomInt(0, 15);
            } else if (job.status === 'in_progress') {
                // In progress jobs: must have at least 1 accepted proposal, plus 3-20 others
                numProposals = randomInt(4, 20);
            } else if (job.status === 'completed') {
                // Completed jobs: must have 1 accepted, plus 3-25 others
                numProposals = randomInt(4, 25);
            } else if (job.status === 'cancelled') {
                // Cancelled jobs: 1-10 proposals, all rejected or not selected
                numProposals = randomInt(1, 10);
            }

            // Don't exceed available freelancers
            numProposals = Math.min(numProposals, eligibleFreelancers.length);
            totalProposalsToCreate += numProposals;

            // Shuffle and pick random freelancers
            const selectedFreelancers = shuffleArray(eligibleFreelancers).slice(0, numProposals);

            for (let i = 0; i < selectedFreelancers.length; i++) {
                const freelancer = selectedFreelancers[i];
                
                // Determine proposal status
                let status;
                if (job.status === 'in_progress' || job.status === 'completed') {
                    // First proposal is accepted
                    if (i === 0) {
                        status = 'accepted';
                    } else {
                        // Others are either rejected, not_selected, or viewed
                        const rand = Math.random();
                        if (rand < 0.3) status = 'rejected';
                        else if (rand < 0.6) status = 'not_selected';
                        else if (rand < 0.8) status = 'viewed';
                        else status = 'submitted';
                    }
                } else if (job.status === 'cancelled') {
                    // All proposals are rejected or not_selected
                    status = Math.random() > 0.5 ? 'rejected' : 'not_selected';
                } else {
                    // Open jobs: mix of statuses
                    const rand = Math.random();
                    if (rand < 0.5) status = 'submitted';
                    else if (rand < 0.8) status = 'viewed';
                    else if (rand < 0.95) status = 'not_selected';
                    else status = 'rejected';
                }

                // Bid amount (around job budget with some variation)
                let bidAmount;
                if (job.budget.type === 'fixed') {
                    // +/- 30% of job budget
                    const variation = job.budget.amount * 0.3;
                    bidAmount = Math.round(job.budget.amount + (Math.random() - 0.5) * variation * 2);
                } else {
                    // Hourly rate +/- 20%
                    const variation = job.budget.amount * 0.2;
                    bidAmount = Math.round(job.budget.amount + (Math.random() - 0.5) * variation * 2);
                }
                bidAmount = Math.max(5, bidAmount); // Minimum $5

                // Delivery time
                let deliveryTime;
                if (job.duration) {
                    if (job.duration.unit === 'days') {
                        deliveryTime = randomInt(job.duration.value, job.duration.value + 7);
                    } else if (job.duration.unit === 'weeks') {
                        deliveryTime = randomInt(job.duration.value * 7, job.duration.value * 7 + 14);
                    } else {
                        deliveryTime = randomInt(job.duration.value * 30, job.duration.value * 30 + 15);
                    }
                } else {
                    deliveryTime = randomInt(3, 30);
                }

                // Cover letter
                const yearsOfExperience = randomInt(1, 10);
                const specialtyName = freelancer.specialty?.name || 'this field';
                const coverLetter = generateCoverLetter(specialtyName, yearsOfExperience);

                // Proposal creation date (after job creation, before job close if closed)
                const minDate = new Date(job.createdAt.getTime() + 60000); // At least 1 minute after job
                const maxDate = job.closedAt || new Date();
                const createdAt = randomDate(minDate, maxDate);

                // Viewed and responded dates
                let viewedAt = null;
                let respondedAt = null;

                if (['viewed', 'accepted', 'rejected', 'not_selected'].includes(status)) {
                    // Viewed 1 hour to 5 days after creation
                    viewedAt = new Date(createdAt.getTime() + randomInt(3600000, 432000000));
                    
                    if (['accepted', 'rejected', 'not_selected'].includes(status)) {
                        // Responded 1-48 hours after viewing
                        respondedAt = new Date(viewedAt.getTime() + randomInt(3600000, 172800000));
                    }
                }

                const proposal = {
                    job_id: job._id,
                    freelancer_id: freelancer._id,
                    coverLetter,
                    bidAmount,
                    deliveryTime,
                    status,
                    viewedAt,
                    respondedAt,
                    createdAt,
                    updatedAt: respondedAt || viewedAt || createdAt
                };

                // Add rejection reason if rejected
                if (status === 'rejected') {
                    const rejectionReasons = [
                        'We found a better fit for this project',
                        'Your bid was higher than our budget',
                        'We decided to go with someone with more experience',
                        'The project requirements have changed',
                        'We chose a freelancer with a more relevant portfolio'
                    ];
                    proposal.rejectionReason = randomPick(rejectionReasons);
                }

                proposals.push(proposal);
            }
        }

        console.log(`📝 Preparing to insert ${proposals.length} proposals...`);

        // Sort proposals by creation date
        proposals.sort((a, b) => a.createdAt - b.createdAt);

        // Insert proposals
        let insertedCount = 0;
        let skippedCount = 0;

        try {
            const result = await Proposal.insertMany(proposals, { ordered: false });
            insertedCount = result.length;
        } catch (error) {
            if (error.code === 11000) {
                // Duplicate key errors
                insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
                skippedCount = proposals.length - insertedCount;
            } else {
                throw error;
            }
        }

        console.log(`✅ Proposals: ${insertedCount} inserted, ${skippedCount} skipped (duplicates)`);
        console.log(`📊 Status distribution:`);
        console.log(`   - Submitted: ${proposals.filter(p => p.status === 'submitted').length}`);
        console.log(`   - Viewed: ${proposals.filter(p => p.status === 'viewed').length}`);
        console.log(`   - Accepted: ${proposals.filter(p => p.status === 'accepted').length}`);
        console.log(`   - Rejected: ${proposals.filter(p => p.status === 'rejected').length}`);
        console.log(`   - Not Selected: ${proposals.filter(p => p.status === 'not_selected').length}`);
        console.log('✅ Proposals seeded successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding proposals:', error);
        process.exit(1);
    }
}

seedProposals();
