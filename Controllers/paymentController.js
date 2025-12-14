const Payment = require('../Models/Payment');
const Contract = require('../Models/Contract');
const crypto = require('crypto');

// Generate mock transaction ID
const generateTransactionId = () => {
    return 'TXN-' + crypto.randomBytes(8).toString('hex').toUpperCase();
};

// Mock payment processing (simulates payment gateway)
const mockPaymentGateway = async (amount, paymentMethod) => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Random success/failure (90% success rate)
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
        return {
            success: true,
            transactionId: generateTransactionId(),
            message: 'Payment processed successfully'
        };
    } else {
        return {
            success: false,
            message: 'Payment failed - Insufficient funds or card declined'
        };
    }
};

// Create payment
const createPayment = async (req, res) => {
    try {
        const payerId = req.user.id;
        const { contractId, amount, paymentMethod, description } = req.body;

        if (!contractId || !amount || !paymentMethod) {
            return res.status(400).json({ 
                message: 'contractId, amount, and paymentMethod are required' 
            });
        }

        // Verify contract
        const contract = await Contract.findById(contractId);
        if (!contract) {
            return res.status(404).json({ 
                message: 'Contract not found' 
            });
        }

        // Verify payer is the client
        if (contract.client.toString() !== payerId) {
            return res.status(403).json({ 
                message: 'Only the client can make payment for this contract' 
            });
        }

        // Calculate platform fee (10%)
        const platformFee = amount * 0.10;

        // Create pending payment
        const payment = await Payment.create({
            contract: contractId,
            payer: payerId,
            payee: contract.freelancer,
            amount,
            paymentMethod,
            description,
            platformFee,
            status: 'pending'
        });

        res.status(201).json({
            message: 'Payment created successfully',
            payment
        });
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Process payment (mock)
const processPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ 
                message: 'Payment not found' 
            });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ 
                message: `Payment already ${payment.status}` 
            });
        }

        // Update to processing
        payment.status = 'processing';
        await payment.save();

        // Mock payment gateway call
        const result = await mockPaymentGateway(payment.amount, payment.paymentMethod);

        if (result.success) {
            payment.status = 'completed';
            payment.transactionId = result.transactionId;
            payment.processedAt = new Date();
        } else {
            payment.status = 'failed';
            payment.failureReason = result.message;
        }

        await payment.save();
        await payment.populate('payer', 'first_name last_name email');
        await payment.populate('payee', 'first_name last_name email');

        res.status(200).json({
            message: result.success ? 'Payment completed successfully' : 'Payment failed',
            payment
        });
    } catch (error) {
        console.error('Process payment error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.id;

        const payment = await Payment.findById(paymentId)
            .populate('contract')
            .populate('payer', 'first_name last_name email')
            .populate('payee', 'first_name last_name email');

        if (!payment) {
            return res.status(404).json({ 
                message: 'Payment not found' 
            });
        }

        // Check if user is involved in payment
        if (payment.payer._id.toString() !== userId && payment.payee._id.toString() !== userId) {
            return res.status(403).json({ 
                message: 'Access denied' 
            });
        }

        res.status(200).json(payment);
    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get my payments
const getMyPayments = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query; // 'sent' or 'received'

        let query = {};
        if (type === 'sent') {
            query.payer = userId;
        } else if (type === 'received') {
            query.payee = userId;
        } else {
            query.$or = [{ payer: userId }, { payee: userId }];
        }

        const payments = await Payment.find(query)
            .populate('contract')
            .populate('payer', 'first_name last_name email')
            .populate('payee', 'first_name last_name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: payments.length,
            payments
        });
    } catch (error) {
        console.error('Get my payments error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Refund payment
const refundPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.id;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ 
                message: 'Payment not found' 
            });
        }

        // Only payer can request refund
        if (payment.payer.toString() !== userId) {
            return res.status(403).json({ 
                message: 'Only the payer can request a refund' 
            });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({ 
                message: 'Only completed payments can be refunded' 
            });
        }

        payment.status = 'refunded';
        await payment.save();

        res.status(200).json({
            message: 'Payment refunded successfully',
            payment
        });
    } catch (error) {
        console.error('Refund payment error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get all payments (admin only)
const getAllPayments = async (req, res) => {
    try {
        const { status } = req.query;

        let query = {};
        if (status) query.status = status;

        const payments = await Payment.find(query)
            .populate('contract')
            .populate('payer', 'first_name last_name email')
            .populate('payee', 'first_name last_name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: payments.length,
            payments
        });
    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

module.exports = {
    createPayment,
    processPayment,
    getPaymentById,
    getMyPayments,
    refundPayment,
    getAllPayments
};
