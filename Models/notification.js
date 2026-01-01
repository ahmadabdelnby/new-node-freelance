const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: [
            // Messages
            'new_message', 'unread_messages',
            // Jobs
            'job_posted', 'job_closed', 'job_expired', 'job_updated', 'job_invitation',
            // Proposals
            'new_proposal', 'proposal_accepted', 'proposal_rejected', 'proposal_shortlisted',
            // Contracts
            'contract_created', 'contract_completed', 'contract_cancelled', 'contract_disputed',
            'deliverable_submitted', 'deliverable_accepted', 'deliverable_rejected',
            // Payments
            'payment_received', 'payment_sent', 'payment_released',
            'withdrawal_approved', 'withdrawal_rejected', 'withdrawal_completed', 'balance_low',
            // Reviews
            'review_received', 'review_reminder',
            // Legacy
            'job_invite', 'milestone_completed'
        ],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxLength: 500
    },
    linkUrl: {
        type: String,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    // Reference to related entities
    relatedJob: {
        type: Schema.Types.ObjectId,
        ref: 'Job'
    },
    relatedProposal: {
        type: Schema.Types.ObjectId,
        ref: 'Proposal'
    },
    relatedContract: {
        type: Schema.Types.ObjectId,
        ref: 'Contract'
    },
    relatedUser: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    // For grouping notifications
    category: {
        type: String,
        enum: ['message', 'job', 'proposal', 'contract', 'payment', 'review', 'system'],
        default: 'system'
    },
    readAt: {
        type: Date
    }
}, { timestamps: true });

// Indexes for better performance
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ category: 1 });

module.exports = mongoose.model('Notification', notificationSchema);