const User = require('../Models/User');
const paypalService = require('../services/paypalService');

/**
 * Create PayPal Order for adding funds
 */
const createPayPalOrder = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { amount } = req.body;

    console.log('💰 Create PayPal order request:', { userId, amount });

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

    // Create PayPal order
    const result = await paypalService.createOrder(amount, 'USD');

    if (!result.success) {
      console.error('❌ PayPal order creation failed:', result.error);
      return res.status(500).json({
        message: 'Failed to create PayPal order',
        error: result.error
      });
    }

    console.log('✅ PayPal order created:', result.orderId);

    res.status(200).json({
      success: true,
      orderId: result.orderId,
      amount,
      links: result.links
    });

  } catch (error) {
    console.error('❌ Create PayPal order error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Capture PayPal Order and add funds to user balance
 */
const capturePayPalOrder = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { orderId } = req.body;

    console.log('💳 Capture PayPal order:', { userId, orderId });

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Capture PayPal order
    const result = await paypalService.captureOrder(orderId);

    if (!result.success) {
      console.error('❌ PayPal capture failed:', result.error);
      return res.status(500).json({
        message: 'Failed to capture PayPal payment',
        error: result.error
      });
    }

    // Extract amount from capture
    const amount = parseFloat(result.amount.value);
    console.log(`✅ PayPal payment captured: $${amount}`);

    // Add amount to user balance
    await User.updateOne(
      { _id: userId },
      { $inc: { balance: amount } }
    );

    // Get updated user
    const updatedUser = await User.findById(userId);
    console.log(`✅ Added $${amount} to user balance. New balance: $${updatedUser.balance}`);

    res.status(200).json({
      success: true,
      message: 'Funds added successfully',
      transaction: {
        amount,
        paymentMethod: 'paypal',
        newBalance: updatedUser.balance,
        transactionId: result.captureId,
        paypalOrderId: result.orderId,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Capture PayPal order error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Add funds to user account (mock payment - for testing without PayPal)
 */
const addFundsMock = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { amount, paymentMethod } = req.body;

    console.log('💰 Add funds (mock) request:', { userId, amount, paymentMethod });

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
    console.log(`💳 Processing ${paymentMethod} payment of $${amount} for user ${user.email}`);

    // Add amount to user balance
    await User.updateOne(
      { _id: userId },
      { $inc: { balance: amount } }
    );

    // Get updated user
    const updatedUser = await User.findById(userId);
    console.log(`✅ Added $${amount} to user balance. New balance: $${updatedUser.balance}`);

    res.status(200).json({
      message: 'Funds added successfully (mock)',
      transaction: {
        amount,
        paymentMethod,
        newBalance: updatedUser.balance,
        transactionId: `MOCK_TXN_${Date.now()}`,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Add funds (mock) error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * Withdraw funds to PayPal account
 */
const withdrawFunds = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { amount, paypalEmail } = req.body;

    console.log('💸 Withdraw request:', { userId, amount, paypalEmail });

    // Validation
    if (!amount || amount <= 0) {
      console.log('⚠️ Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Invalid amount',
        details: 'Amount must be greater than 0'
      });
    }

    if (!paypalEmail) {
      console.log('⚠️ PayPal email is missing');
      return res.status(400).json({
        success: false,
        message: 'PayPal email is required',
        details: 'Please provide a valid PayPal email address'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalEmail)) {
      console.log('⚠️ Invalid email format:', paypalEmail);
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }

    // Minimum withdrawal amount
    if (amount < 10) {
      console.log('⚠️ Amount below minimum:', amount);
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is $10',
        details: `You requested $${amount}, minimum is $10`
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        details: 'User account does not exist'
      });
    }

    console.log(`📊 User balance check: Current=$${user.balance}, Requested=$${amount}`);

    // Check sufficient balance
    if (user.balance < amount) {
      console.log('⚠️ Insufficient balance:', {
        current: user.balance,
        requested: amount,
        shortage: amount - user.balance
      });
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        details: {
          currentBalance: user.balance,
          requestedAmount: amount,
          shortage: (amount - user.balance).toFixed(2)
        }
      });
    }

    // Create PayPal payout
    console.log('🚀 Initiating PayPal payout...', { email: paypalEmail, amount });

    const result = await paypalService.createPayout(
      paypalEmail,
      amount,
      'USD',
      `Withdrawal from Freelancing Platform - User ${user.first_name} ${user.last_name}`
    );

    if (!result.success) {
      console.error('❌ PayPal payout failed:', {
        error: result.error,
        details: result.details,
        email: paypalEmail,
        amount
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to process withdrawal',
        error: result.error,
        details: 'PayPal payout request was rejected. This may be a Sandbox limitation.',
        note: 'In Production mode, this will work correctly.',
        paypalEmail,
        amount
      });
    }

    console.log('✅ PayPal payout initiated successfully:', {
      batchId: result.batchId,
      status: result.status,
      email: paypalEmail,
      amount
    });

    // Deduct amount from user balance
    console.log(`💰 Deducting $${amount} from user balance...`);
    await User.updateOne(
      { _id: userId },
      { $inc: { balance: -amount } }
    );

    // Get updated user
    const updatedUser = await User.findById(userId);
    console.log(`✅ Balance updated: $${user.balance} → $${updatedUser.balance}`);

    // Track withdrawal in Payment model
    const Payment = require('../Models/Payment');
    const paymentRecord = await Payment.create({
      payer: userId,
      payee: userId, // Same user for withdrawal
      amount: amount,
      totalAmount: amount,
      paymentMethod: 'paypal',
      status: 'completed',
      type: 'withdrawal',
      description: `Withdrawal to PayPal: ${paypalEmail}`,
      paypalBatchId: result.batchId,
      paypalEmail: paypalEmail,
      processedAt: new Date()
    });

    console.log('📝 Payment record created:', paymentRecord._id);
    console.log('🎉 Withdrawal completed successfully!');

    // 🔥 SEND WITHDRAWAL NOTIFICATION
    try {
      const Notification = require('../Models/notification');
      const { getIO } = require('../services/socketService');

      await Notification.create({
        user: userId,
        type: 'withdrawal_completed',
        content: `Withdrawal of $${amount} to PayPal (${paypalEmail}) completed successfully`,
        linkUrl: `/payments/${paymentRecord._id}`,
        category: 'payment'
      });

      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit('withdrawal_completed', {
          amount: amount,
          paypalEmail: paypalEmail,
          newBalance: updatedUser.balance
        });
      }

      console.log('✅ Withdrawal notification sent');
    } catch (notifError) {
      console.error('⚠️ Failed to send withdrawal notification:', notifError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal processed successfully. Funds will be sent to your PayPal account.',
      transaction: {
        amount,
        paypalEmail,
        previousBalance: user.balance,
        newBalance: updatedUser.balance,
        batchId: result.batchId,
        status: result.status,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Withdraw funds error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Server error during withdrawal',
      error: error.message,
      details: 'An unexpected error occurred. Please try again or contact support.'
    });
  }
};

module.exports = {
  createPayPalOrder,
  capturePayPalOrder,
  addFundsMock,
  withdrawFunds
};

