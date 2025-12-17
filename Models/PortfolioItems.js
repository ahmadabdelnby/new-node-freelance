const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const portfolioItemSchema = new Schema({

    freelancer: {
        type: Schema.Types.ObjectId,
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
        maxLength: 2000
    },
    images: [
        {
            type: String,
            required: true
        }
    ],
    githubUrl: {
        type: String,
        trim: true
    },
    liveUrl: {
        type: String,
        trim: true
    },
    skills: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Skill',
            required: true
        }
    ],
    dateCompleted: {
        type: Date,
        required: true
    },
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    views: {
        type: Number,
        default: 0,
        min: 0
    },
    viewedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isPublic: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Indexes for better performance
portfolioItemSchema.index({ freelancer: 1 });
portfolioItemSchema.index({ skills: 1 });
portfolioItemSchema.index({ views: -1 });
portfolioItemSchema.index({ likes: -1 });
portfolioItemSchema.index({ isFeatured: 1 });
portfolioItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PortfolioItem', portfolioItemSchema);