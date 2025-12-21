const User = require('../Models/User');

// Add funds to user account (mock payment)
const addFunds = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { amount, paymentMethod } = req.body;

    console.log('💰 Add funds request:', { userId, amount, paymentMethod });

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (amount < 10) {
      return res.status(400).json({ message: 'Minimum deposit amount is $10' });
    }

    if (amount > 10000) {
      return res.status(400).json({ message: 'Maximum deposit amount is $10,000' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mock payment processing
    // In production, this would integrate with Stripe/PayPal
    console.log(`💳 Processing ${paymentMethod} payment of $${amount} for user ${user.email}`);

    // Add amount to user balance (using updateOne to avoid password validation)
    await User.updateOne(
      { _id: userId },
      { $inc: { balance: amount } }
    );

    // Get updated user
    const updatedUser = await User.findById(userId);
    console.log(`✅ Added $${amount} to user balance. New balance: $${updatedUser.balance}`);

    // Return success response
    res.status(200).json({
      message: 'Funds added successfully',
      transaction: {
        amount,
        paymentMethod,
        newBalance: updatedUser.balance,
        transactionId: `TXN_${Date.now()}`,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Add funds error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = {
  addFunds
};

