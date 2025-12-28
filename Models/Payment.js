const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    contract: {
        type: Schema.Types.ObjectId,
        ref: 'Contract',
        required: false // Not required for withdrawals
    },
    payer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    payee: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be greater than 0']
    },
    currency: {
        type: String,
        default: 'USD'
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'wallet'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'held', 'released'],
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['payment', 'withdrawal', 'refund', 'escrow'],
        default: 'payment'
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    description: {
        type: String,
        trim: true
    },
    platformFee: {
        type: Number,
        default: 0,
        min: 0
    },
    netAmount: {
        type: Number
    },
    totalAmount: {
        type: Number
    },
    failureReason: {
        type: String,
        trim: true
    },
    refundReason: {
        type: String,
        trim: true
    },
    processedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    refundedAt: {
        type: Date
    },
    // For escrow system
    releasedAt: {
        type: Date
    },
    isEscrow: {
        type: Boolean,
        default: true
    },
    // For PayPal withdrawals
    paypalBatchId: {
        type: String
    },
    paypalEmail: {
        type: String
    },
    paymentGatewayResponse: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ contract: 1 });
paymentSchema.index({ payer: 1 });
paymentSchema.index({ payee: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Calculate amounts before saving
paymentSchema.pre('save', function (next) {
    if (this.isModified('amount') || this.isModified('platformFee')) {
        this.totalAmount = this.amount + (this.platformFee || 0);
        this.netAmount = this.amount - (this.platformFee || 0);
    }
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);
