const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    // Reference to the client who posted the job(user id)
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minLength: 50,
        maxLength: 5000
    },
    specialty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialty',
        required: true
    },
    // An array of references to the specific skills needed
    skills: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill'
    }],
    budget: {
        type: {
            type: String,
            enum: ['hourly', 'fixed'],
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Budget must be greater than 0']
        }
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'completed', 'cancelled'],
        default: 'open'
    },
    // New fields
    deadline: {
        type: Date
    },
    duration: {
        value: Number,
        unit: {
            type: String,
            enum: ['days', 'weeks', 'months']
        }
    },
    proposalsCount: {
        type: Number,
        default: 0,
        min: 0
    },
    views: {
        type: Number,
        default: 0,
        min: 0
    },
    attachments: [{
        url: String,
        fileName: String,
        fileType: String
    }],
    visibility: {
        type: String,
        enum: ['public', 'private', 'invited_only'],
        default: 'public'
    },
    // Invited freelancers (for private jobs)
    invitedFreelancers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    featured: {
        type: Boolean,
        default: false
    },
    // When job was closed/completed
    closedAt: {
        type: Date
    },
    // AI embedding for job matching/recommendation
    embedding: {
        type: [Number],
        default: undefined
    }
}, {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true
});

// Indexes for better performance
jobSchema.index({ client: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ specialty: 1 });
jobSchema.index({ 'budget.type': 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ featured: 1 });
jobSchema.index({ views: -1 });

// Text index for search
jobSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Job', jobSchema);