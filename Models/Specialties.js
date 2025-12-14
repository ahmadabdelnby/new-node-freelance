const mongoose = require('mongoose');

const specialtySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxLength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxLength: 500
    },
    Category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    icon: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Indexes for better performance (name already indexed via unique:true)
specialtySchema.index({ Category: 1 });
specialtySchema.index({ isActive: 1 });

module.exports = mongoose.model('Specialty', specialtySchema);