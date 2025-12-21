const mongoose = require('mongoose');
const User = require('../Models/User');
require('dotenv').config();

const addBalanceToUsers = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all users without balance field or with null/undefined balance
    const usersToUpdate = await User.find({
      $or: [
        { balance: { $exists: false } },
        { balance: null },
        { balance: undefined }
      ]
    });

    console.log(`📊 Found ${usersToUpdate.length} users without balance`);

    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have balance field');
      process.exit(0);
    }

    // Update all users to have default balance of 1000
    const result = await User.updateMany(
      {
        $or: [
          { balance: { $exists: false } },
          { balance: null },
          { balance: undefined }
        ]
      },
      {
        $set: { balance: 1000 }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with default balance of 1000`);

    // Verify the update
    const updatedUsers = await User.find({ balance: { $exists: true } });
    console.log(`✅ Total users with balance: ${updatedUsers.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding balance to users:', error);
    process.exit(1);
  }
};

addBalanceToUsers();
