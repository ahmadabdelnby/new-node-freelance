const mongoose = require('mongoose');

/**
 * ViewLog Model
 * Tracks job views for deduplication (especially for guest users)
 * Auto-expires after 24 hours to keep database clean
 */
const viewLogSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        index: true
    },
    // For authenticated users
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        sparse: true // Allow null for guest users
    },
    // For guest users - IP-based deduplication
    ip: {
        type: String,
        sparse: true
    },
    userAgent: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // Auto-delete after 24 hours (TTL index)
    }
});

// Compound indexes for efficient queries
viewLogSchema.index({ job: 1, user: 1, createdAt: -1 });
viewLogSchema.index({ job: 1, ip: 1, createdAt: -1 });

module.exports = mongoose.model('ViewLog', viewLogSchema);
