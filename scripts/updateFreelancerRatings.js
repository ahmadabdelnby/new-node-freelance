const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Review = require('../Models/review.model');
const User = require('../Models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

async function updateFreelancerRatings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 Updating freelancer ratings...\n');
    
    // Get all users (freelancers and clients can both be reviewees)
    const users = await User.find();
    let updated = 0;
    
    for (const user of users) {
      // Get all reviews where this user is the reviewee (person being reviewed)
      const userReviews = await Review.find({ reviewee: user._id });
      
      if (userReviews.length > 0) {
        const totalRating = userReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / userReviews.length;
        
        await User.updateOne(
          { _id: user._id },
          { 
            averageRating: parseFloat(averageRating.toFixed(2)),
            totalReviews: userReviews.length
          }
        );
        
        updated++;
        console.log(`✓ ${user.first_name} ${user.last_name}: ${averageRating.toFixed(1)} ⭐ (${userReviews.length} reviews)`);
      } else {
        // Reset ratings if no reviews
        await User.updateOne(
          { _id: user._id },
          { 
            averageRating: 0,
            totalReviews: 0
          }
        );
      }
    }

    console.log(`\n✅ Updated ${updated} users with review statistics`);

    // Show summary
    const usersWithReviews = await User.find({ totalReviews: { $gt: 0 } }).sort({ averageRating: -1 });
    console.log(`\n📈 Top 5 Rated Users:\n`);
    
    usersWithReviews.slice(0, 5).forEach((user, index) => {
      const stars = '⭐'.repeat(Math.round(user.averageRating));
      console.log(`${index + 1}. ${user.first_name} ${user.last_name}: ${user.averageRating.toFixed(1)} ${stars} (${user.totalReviews} reviews)`);
    });

    console.log('\n✅ All freelancer ratings updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateFreelancerRatings();
