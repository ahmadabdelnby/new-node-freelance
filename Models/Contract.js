//ahmed-dev branch

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const contractSchema = new Schema({
    // Reference to the job
    job: { 
        type: Schema.Types.ObjectId, 
        ref: 'Job', 
        required: true 
    },
    // Reference to the client
    client: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // Reference to the freelancer
    freelancer: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // Reference to the winning proposal
    proposal: { 
        type: Schema.Types.ObjectId, 
        ref: 'Proposal', 
        required: true 
    },
    // The final agreed-upon price (if fixed) or hourly rate (if hourly)
    agreedAmount: { 
        type: Number, 
        required: true,
        min: [0, 'Amount must be greater than or equal to 0']
    },
    // To know if the agreedAmount is fixed or hourly
    budgetType: {
        type: String,
        enum: ['hourly', 'fixed'],
        required: true
    },
    status: { 
        type: String, 
        enum: ['active', 'paused', 'completed', 'terminated'], 
        default: 'active' 
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    deliveredAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    description: {
        type: String,
        trim: true
    },
    // Track work progress
    hoursWorked: {
        type: Number,
        default: 0,
        min: 0
    },
    // For milestone-based contracts
    milestonesCompleted: {
        type: Number,
        default: 0,
        min: 0
    }
}, { 
    // Automatically adds createdAt and updatedAt fields
    timestamps: true 
});

// Indexes for better query performance
contractSchema.index({ client: 1 });
contractSchema.index({ freelancer: 1 });
contractSchema.index({ job: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ createdAt: -1 });
contractSchema.index({ budgetType: 1 });

module.exports = mongoose.model('Contract', contractSchema);