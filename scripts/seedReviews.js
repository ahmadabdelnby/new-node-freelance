const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Review = require('../Models/review.model');
const Contract = require('../Models/Contract');
const User = require('../Models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

// Review comments templates based on rating
const reviewTemplates = {
  5: [
    'Excellent work! {name} exceeded all expectations. Highly professional and delivered outstanding results.',
    'Outstanding freelancer! {name} completed the project perfectly and on time. Would definitely hire again.',
    'Amazing experience working with {name}. Great communication, top-quality work, and very professional.',
    'Exceptional work by {name}! Delivered exactly what I needed with excellent attention to detail.',
    'Perfect! {name} is a true professional. The quality of work is exceptional and delivery was prompt.',
    'Fantastic job! {name} went above and beyond expectations. Highly recommended for future projects.',
    'Superb quality work! {name} is very skilled and delivers excellent results. Will hire again.',
    'Brilliant work! {name} understood requirements perfectly and delivered outstanding quality.',
    'Highly impressed with {name}\'s work. Professional, efficient, and produces excellent results.',
    'Top-notch work! {name} is reliable, skilled, and delivers exceptional quality every time.'
  ],
  4: [
    'Great work by {name}! Very professional and delivered quality results. Minor revisions needed but overall excellent.',
    'Very good experience with {name}. The work was of high quality and communication was clear.',
    'Solid work! {name} delivered good results and was professional throughout the project.',
    'Good job! {name} completed the work efficiently with good quality. Would consider hiring again.',
    'Nice work from {name}. Professional approach and delivered quality output with minimal revisions.',
    'Very satisfied with {name}\'s work. Good communication and delivered as expected.',
    'Quality work! {name} was responsive and delivered good results. A few minor adjustments needed.',
    'Good experience working with {name}. Professional and delivers solid work.',
    'Well done! {name} completed the project with good quality and reasonable timeframe.',
    'Satisfactory work from {name}. Professional and delivers quality results with minor tweaks needed.'
  ],
  3: [
    'Decent work by {name}. Got the job done but there were some issues that needed fixing.',
    'Average experience. {name} completed the work but required several revisions.',
    'Okay work. {name} delivered but communication could have been better.',
    'Acceptable work from {name}. The project was completed but not exactly as expected.',
    'Fair job. {name} needs to improve on communication and attention to detail.',
    'Moderate experience with {name}. Work was completed but required significant revisions.',
    'Adequate work. {name} delivered but the quality could be improved.',
    'So-so experience. {name} got the work done but it needed multiple corrections.',
    'Basic work completed by {name}. Functional but lacks polish and refinement.',
    'Acceptable outcome from {name}. Work delivered but expectations were not fully met.'
  ],
  2: [
    'Below expectations. {name} completed the work but quality was lacking and required major revisions.',
    'Disappointing experience. {name} struggled with the requirements and delivery was delayed.',
    'Not satisfied with the work. {name} needs significant improvement in skills and communication.',
    'Poor quality work from {name}. Multiple issues and delays throughout the project.',
    'Unsatisfactory experience. {name} failed to meet basic requirements and deadlines.',
    'Work quality was poor. {name} required constant supervision and extensive revisions.',
    'Below average work. {name} did not meet expectations and communication was lacking.',
    'Subpar performance from {name}. Work needed extensive corrections and was delivered late.',
    'Not happy with the results. {name} lacked the necessary skills for this project.',
    'Disappointing outcome. {name} failed to deliver quality work despite multiple attempts.'
  ],
  1: [
    'Very disappointing. {name} failed to deliver acceptable work. Would not recommend.',
    'Poor experience overall. {name} did not meet any of the project requirements.',
    'Unacceptable work quality. {name} wasted time and delivered nothing usable.',
    'Terrible experience. {name} showed unprofessional behavior and failed to deliver.',
    'Complete waste of time. {name} could not complete even basic tasks correctly.',
    'Extremely unsatisfied. {name} lacks basic skills and professionalism.',
    'Would not recommend. {name} failed to deliver and communication was non-existent.',
    'Very poor work. {name} did not understand requirements and delivered unusable results.',
    'Highly disappointing. {name} showed no commitment and failed to deliver.',
    'Unprofessional and incompetent. {name} could not handle the project at all.'
  ]
};

function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomRating() {
  // Rating distribution: 50% = 5 stars, 25% = 4 stars, 15% = 3 stars, 7% = 2 stars, 3% = 1 star
  const rand = Math.random();
  if (rand < 0.50) return 5;
  if (rand < 0.75) return 4;
  if (rand < 0.90) return 3;
  if (rand < 0.97) return 2;
  return 1;
}

function generateReviewComment(rating, freelancerName) {
  const template = randomPick(reviewTemplates[rating]);
  return template.replace('{name}', freelancerName);
}

async function seedReviews() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all completed contracts
    const completedContracts = await Contract.find({ status: 'completed' })
      .populate('client')
      .populate('freelancer')
      .sort({ createdAt: 1 });

    console.log(`📋 Found ${completedContracts.length} completed contracts`);

    if (completedContracts.length === 0) {
      console.log('❌ No completed contracts found. Please complete some contracts first.');
      process.exit(1);
    }

    // Check existing reviews
    const existingReviews = await Review.find();
    console.log(`📊 Existing reviews: ${existingReviews.length}`);

    const reviews = [];
    let skipped = 0;
    let created = 0;

    for (const contract of completedContracts) {
      if (!contract.client || !contract.freelancer) {
        console.log(`⚠️ Skipping contract ${contract._id}: Missing client or freelancer`);
        skipped++;
        continue;
      }

      // Check if review already exists for this contract and client
      const existingReview = await Review.findOne({
        contract: contract._id,
        reviewer: contract.client._id
      });

      if (existingReview) {
        skipped++;
        continue;
      }

      // Generate review from client to freelancer
      const rating = getRandomRating();
      const freelancerName = `${contract.freelancer.first_name} ${contract.freelancer.last_name}`;
      const comment = generateReviewComment(rating, freelancerName);

      const review = {
        contract: contract._id,
        reviewer: contract.client._id,
        reviewee: contract.freelancer._id,
        rating: rating,
        comment: comment,
        createdAt: new Date(contract.closedAt || contract.updatedAt),
        updatedAt: new Date(contract.closedAt || contract.updatedAt)
      };

      reviews.push(review);
      created++;
    }

    if (reviews.length > 0) {
      // Insert reviews
      await Review.insertMany(reviews);
      console.log(`✅ Created ${created} new reviews`);
    }

    if (skipped > 0) {
      console.log(`⏭️ Skipped ${skipped} contracts (already reviewed or invalid)`);
    }

    // Calculate and update average ratings for all freelancers
    console.log('\n📊 Updating freelancer ratings...');
    
    const freelancers = await User.find({ role: 'freelancer' });
    
    for (const freelancer of freelancers) {
      const freelancerReviews = await Review.find({ reviewee: freelancer._id });
      
      if (freelancerReviews.length > 0) {
        const totalRating = freelancerReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / freelancerReviews.length;
        
        await User.updateOne(
          { _id: freelancer._id },
          { 
            averageRating: parseFloat(averageRating.toFixed(2)),
            reviewsCount: freelancerReviews.length
          }
        );
        
        console.log(`   ✓ ${freelancer.first_name} ${freelancer.last_name}: ${averageRating.toFixed(1)} ⭐ (${freelancerReviews.length} reviews)`);
      }
    }

    // Show statistics
    console.log('\n📈 Review Statistics:');
    const totalReviews = await Review.countDocuments();
    const rating5 = await Review.countDocuments({ rating: 5 });
    const rating4 = await Review.countDocuments({ rating: 4 });
    const rating3 = await Review.countDocuments({ rating: 3 });
    const rating2 = await Review.countDocuments({ rating: 2 });
    const rating1 = await Review.countDocuments({ rating: 1 });

    console.log(`   - Total Reviews: ${totalReviews}`);
    console.log(`   - 5 Stars: ${rating5} (${((rating5/totalReviews)*100).toFixed(1)}%)`);
    console.log(`   - 4 Stars: ${rating4} (${((rating4/totalReviews)*100).toFixed(1)}%)`);
    console.log(`   - 3 Stars: ${rating3} (${((rating3/totalReviews)*100).toFixed(1)}%)`);
    console.log(`   - 2 Stars: ${rating2} (${((rating2/totalReviews)*100).toFixed(1)}%)`);
    console.log(`   - 1 Star: ${rating1} (${((rating1/totalReviews)*100).toFixed(1)}%)`);

    const avgRating = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    console.log(`   - Average Rating: ${avgRating[0]?.avgRating.toFixed(2)} ⭐`);

    console.log('\n✅ Reviews seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
    process.exit(1);
  }
}

seedReviews();
