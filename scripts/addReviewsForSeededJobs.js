/**
 * Add Reviews for Seeded Jobs
 * 
 * This script adds reviews for the completed contracts from the seeded jobs.
 * It creates contracts for jobs and then adds reviews from clients to freelancers.
 * 
 * Run with: node scripts/addReviewsForSeededJobs.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('../Models/Jobs');
const Proposal = require('../Models/proposals');
const Contract = require('../Models/Contract');
const Review = require('../Models/review.model');
const User = require('../Models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

// The 4 users provided
const USER_IDS = [
    '69562e1bc5ca1f27866ba533', // RehabBakhet
    '694d397e4a4146338ecec198', // Ahmed
    '694d3fceb77350a130c170d9', // Mohamed_Makram
    '694faba9de10e50fc80f1e6a'  // radwa1
];

// Positive review comments for freelancers
const POSITIVE_REVIEWS = [
    { rating: 5, comment: 'Excellent work! Delivered on time and exceeded expectations. The code quality was outstanding and communication was great throughout the project. Highly recommended!' },
    { rating: 5, comment: 'Amazing developer! Very professional and skilled. The project was completed perfectly and they were very responsive to all my requirements. Will definitely hire again.' },
    { rating: 5, comment: 'Outstanding performance! The freelancer demonstrated exceptional skills and delivered high-quality work. Very satisfied with the results and would recommend to anyone.' },
    { rating: 4, comment: 'Great work overall! The developer was skilled and professional. There were minor revisions needed but they were handled quickly. Very happy with the final result.' },
    { rating: 4, comment: 'Good experience working with this freelancer. They delivered quality work within the deadline. Communication was clear and they were open to feedback.' },
    { rating: 5, comment: 'Perfect execution! The freelancer understood the requirements perfectly and delivered exactly what was needed. Clean code, great documentation, and excellent communication.' },
    { rating: 5, comment: 'Incredible talent! This freelancer went above and beyond to deliver exceptional work. They were proactive, professional, and a pleasure to work with.' },
    { rating: 4, comment: 'Very good developer. Completed the project successfully with good attention to detail. Would recommend for similar projects.' },
    { rating: 5, comment: 'Top-notch work! The quality of deliverables exceeded my expectations. The freelancer was responsive, skilled, and very easy to work with.' },
    { rating: 4, comment: 'Solid work from a reliable freelancer. They met all deadlines and delivered good quality work. Happy with the collaboration.' }
];

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

async function addReviewsForSeededJobs() {
    console.log('🚀 Starting to add reviews for seeded jobs...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let contractsCreated = 0;
    let reviewsCreated = 0;

    // Get all jobs created by our users that are completed or in_progress
    const jobs = await Job.find({
        client: { $in: USER_IDS.map(id => new mongoose.Types.ObjectId(id)) },
        status: { $in: ['completed', 'in_progress', 'open'] }
    });

    console.log(`📊 Found ${jobs.length} jobs to process\n`);

    for (const job of jobs) {
        // Get accepted proposals for this job
        const proposals = await Proposal.find({
            job_id: job._id,
            freelancer_id: { $in: USER_IDS.map(id => new mongoose.Types.ObjectId(id)) }
        });

        for (const proposal of proposals) {
            // Skip if freelancer is the same as client
            if (proposal.freelancer_id.toString() === job.client.toString()) {
                continue;
            }

            // Check if contract already exists
            let contract = await Contract.findOne({
                job: job._id,
                freelancer: proposal.freelancer_id
            });

            // Create contract if it doesn't exist
            if (!contract) {
                try {
                    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
                    const deliveryTime = proposal.deliveryTime || 14; // days
                    const calculatedDeadline = new Date(startDate.getTime() + deliveryTime * 24 * 60 * 60 * 1000);
                    
                    contract = new Contract({
                        job: job._id,
                        client: job.client,
                        freelancer: proposal.freelancer_id,
                        proposal: proposal._id,
                        agreedAmount: proposal.bidAmount,
                        budgetType: job.budget.type,
                        agreedDeliveryTime: deliveryTime,
                        calculatedDeadline: calculatedDeadline,
                        status: 'completed',
                        startDate: startDate,
                        endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
                        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                        description: job.description
                    });
                    await contract.save();
                    contractsCreated++;

                    // Update proposal status
                    await Proposal.findByIdAndUpdate(proposal._id, { status: 'accepted' });
                    
                    // Update job status to completed
                    await Job.findByIdAndUpdate(job._id, { status: 'completed' });

                    console.log(`   ✅ Created contract for job: "${job.title.substring(0, 40)}..."`);
                } catch (err) {
                    if (err.code !== 11000) {
                        console.error(`   ⚠️ Error creating contract: ${err.message}`);
                    }
                    continue;
                }
            }

            // Check if review already exists
            const existingReview = await Review.findOne({
                contract: contract._id,
                reviewer: job.client
            });

            if (!existingReview) {
                try {
                    const reviewData = getRandomElement(POSITIVE_REVIEWS);
                    const review = new Review({
                        contract: contract._id,
                        reviewer: job.client,
                        reviewee: proposal.freelancer_id,
                        rating: reviewData.rating,
                        comment: reviewData.comment
                    });
                    await review.save();
                    reviewsCreated++;
                    console.log(`   ⭐ Added ${reviewData.rating}-star review for freelancer`);
                } catch (err) {
                    if (err.code !== 11000) {
                        console.error(`   ⚠️ Error creating review: ${err.message}`);
                    }
                }
            }
        }
    }

    // Also update freelancer ratings
    console.log('\n🔄 Updating freelancer ratings...');
    
    for (const userId of USER_IDS) {
        const reviews = await Review.find({ reviewee: new mongoose.Types.ObjectId(userId) });
        if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            const averageRating = totalRating / reviews.length;
            
            await User.findByIdAndUpdate(userId, {
                'freelancerProfile.rating': Math.round(averageRating * 10) / 10,
                'freelancerProfile.completedJobs': reviews.length
            });
            
            console.log(`   ✅ Updated ${userId}: ${reviews.length} reviews, avg rating: ${averageRating.toFixed(1)}`);
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Contracts created: ${contractsCreated}`);
    console.log(`   ✅ Reviews created: ${reviewsCreated}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
}

addReviewsForSeededJobs().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
