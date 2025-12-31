const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../Models/User');
const Review = require('../Models/review.model');

dotenv.config();

async function quickCheck() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const usersWithReviews = await User.find({ totalReviews: { $gt: 0 } });
    console.log(`\n📊 Users with reviews: ${usersWithReviews.length}\n`);
    
    usersWithReviews.forEach(u => {
      console.log(`- ${u.first_name} ${u.last_name}: ${u.averageRating} ⭐ (${u.totalReviews} reviews)`);
    });
    
    const totalReviews = await Review.countDocuments();
    console.log(`\n📝 Total reviews in database: ${totalReviews}`);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

quickCheck();
