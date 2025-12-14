const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['new_message', 'proposal_accepted', 'proposal_rejected', 'job_invite', 'payment_received', 'payment_sent', 'contract_created', 'contract_completed', 'review_received', 'milestone_completed'],
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