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
    projectUrl: {
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
    views: {
        type: Number,
        default: 0,
        min: 0
    },
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