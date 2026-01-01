const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const contractModificationRequestSchema = new Schema({
    // Reference to the contract
    contract: {
        type: Schema.Types.ObjectId,
        ref: 'Contract',
        required: true
    },
    // Reference to the job
    job: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    // Who requested the modification (freelancer)
    requestedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Who should approve/reject (client)
    requestedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Type of modification
    modificationType: {
        type: String,
        enum: ['budget', 'deadline', 'both'],
        required: true
    },
    // Current values (for reference)
    currentValues: {
        budget: {
            type: Number
        },
        deadline: {
            type: Date
        },
        deliveryTime: {
            type: Number // in days
        }
    },
    // Requested new values
    requestedValues: {
        budget: {
            type: Number
        },
        deadline: {
            type: Date
        },
        deliveryTime: {
            type: Number // in days
        }
    },
    // Reason for modification
    reason: {
        type: String,
        required: true,
        trim: true,
        maxLength: 1000
    },
    // Status of the request
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // Response from client (optional note)
    responseNote: {
        type: String,
        trim: true,
        maxLength: 500
    },
    // When the request was responded to
    respondedAt: {
        type: Date
    },
    // Budget difference (positive = increase, negative = decrease)
    budgetDifference: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for better query performance
contractModificationRequestSchema.index({ contract: 1 });
contractModificationRequestSchema.index({ requestedBy: 1 });
contractModificationRequestSchema.index({ requestedTo: 1 });
contractModificationRequestSchema.index({ status: 1 });
contractModificationRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContractModificationRequest', contractModificationRequestSchema);
