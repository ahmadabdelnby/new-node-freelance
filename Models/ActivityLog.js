const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    // Who performed the action
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Action type
    action: {
        type: String,
        required: true,
        enum: [
            'login',
            'logout',
            'create',
            'update',
            'delete',
            'view',
            'approve',
            'reject',
            'suspend',
            'activate',
            'settings_change',
            'export',
            'other'
        ]
    },
    
    // What entity was affected
    entityType: {
        type: String,
        required: true,
        enum: [
            'user',
            'job',
            'proposal',
            'contract',
            'payment',
            'category',
            'skill',
            'specialty',
            'country',
            'contact',
            'platform_settings',
            'system'
        ]
    },
    
    // Entity ID (if applicable)
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    
    // Description of the action
    description: {
        type: String,
        required: true
    },
    
    // Additional details (JSON)
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // IP Address
    ipAddress: {
        type: String
    },
    
    // User Agent
    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient queries
activityLogSchema.index({ admin: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
