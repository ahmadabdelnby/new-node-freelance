const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
    // Commission Settings
    commissionRate: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    
    // Minimum/Maximum Limits
    minProjectBudget: {
        type: Number,
        default: 10
    },
    maxProjectBudget: {
        type: Number,
        default: 100000
    },
    minWithdrawal: {
        type: Number,
        default: 50
    },
    maxWithdrawal: {
        type: Number,
        default: 10000
    },
    
    // Platform Limits
    maxProposalsPerJob: {
        type: Number,
        default: 50
    },
    maxActiveJobsPerClient: {
        type: Number,
        default: 20
    },
    maxActiveContractsPerFreelancer: {
        type: Number,
        default: 10
    },
    
    // Time Limits (in days)
    proposalExpirationDays: {
        type: Number,
        default: 14
    },
    contractDeadlineExtensionDays: {
        type: Number,
        default: 7
    },
    
    // Feature Toggles
    allowNewRegistrations: {
        type: Boolean,
        default: true
    },
    requireEmailVerification: {
        type: Boolean,
        default: true
    },
    enableWithdrawals: {
        type: Boolean,
        default: true
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    
    // Last updated by
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
platformSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
