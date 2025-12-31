const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Review = require('../Models/review.model');
const Contract = require('../Models/Contract');
const User = require('../Models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

async function checkFreelancerReviews() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all freelancers with reviews
    const freelancers = await User.find({ 
      reviewsCount: { $gt: 0 }
    }).sort({ averageRating: -1, reviewsCount: -1 });

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              📊 Freelancer Reviews Report                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`📈 Total Freelancers with Reviews: ${freelancers.length}\n`);

    // Top rated freelancers
    console.log('🏆 Top 10 Freelancers by Rating:\n');
    const topFreelancers = freelancers.slice(0, 10);
    
    for (let i = 0; i < topFreelancers.length; i++) {
      const freelancer = topFreelancers[i];
      const reviews = await Review.find({ reviewee: freelancer._id })
        .populate('reviewer', 'first_name last_name')
        .populate('contract')
        .sort({ createdAt: -1 });

      const stars = '⭐'.repeat(Math.round(freelancer.averageRating));
      console.log(`${i + 1}. ${freelancer.first_name} ${freelancer.last_name}`);
      console.log(`   Rating: ${freelancer.averageRating.toFixed(1)} ${stars} (${freelancer.reviewsCount} reviews)`);
      console.log(`   Specialty: ${freelancer.specialty?.name || 'N/A'}`);
      console.log(`   Country: ${freelancer.country || 'N/A'}`);
      
      // Show latest review
      if (reviews.length > 0) {
        const latestReview = reviews[0];
        console.log(`   Latest Review: "${latestReview.comment.substring(0, 80)}..."`);
        console.log(`   By: ${latestReview.reviewer.first_name} ${latestReview.reviewer.last_name} (${latestReview.rating} ⭐)`);
      }
      console.log('');
    }

    // Rating distribution
    console.log('\n📊 Overall Statistics:\n');
    
    const totalReviews = await Review.countDocuments();
    const avgRating = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    console.log(`   Total Reviews: ${totalReviews}`);
    console.log(`   Average Rating: ${avgRating[0]?.avgRating.toFixed(2)} ⭐`);
    
    // Rating breakdown
    const ratingCounts = await Review.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    console.log('\n   Rating Distribution:');
    for (const rating of ratingCounts) {
      const percentage = ((rating.count / totalReviews) * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(rating.count / totalReviews * 50));
      console.log(`   ${rating._id} ⭐: ${bar} ${rating.count} (${percentage}%)`);
    }

    // Freelancers without reviews
    const freelancersWithoutReviews = await User.countDocuments({ 
      $or: [
        { reviewsCount: { $exists: false } },
        { reviewsCount: 0 }
      ]
    });

    console.log(`\n   Freelancers without reviews: ${freelancersWithoutReviews}`);

    // Sample reviews by rating
    console.log('\n\n📝 Sample Reviews by Rating:\n');
    
    for (let rating = 5; rating >= 1; rating--) {
      const sampleReview = await Review.findOne({ rating })
        .populate('reviewer', 'first_name last_name')
        .populate('reviewee', 'first_name last_name')
        .populate('contract', 'job');

      if (sampleReview) {
        console.log(`${rating} ⭐ Review:`);
        console.log(`   From: ${sampleReview.reviewer.first_name} ${sampleReview.reviewer.last_name}`);
        console.log(`   To: ${sampleReview.reviewee.first_name} ${sampleReview.reviewee.last_name}`);
        console.log(`   Comment: "${sampleReview.comment}"`);
        console.log('');
      }
    }

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ Report Complete                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFreelancerReviews();
