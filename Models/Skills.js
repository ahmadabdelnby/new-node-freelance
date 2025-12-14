const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicate skill names
        trim: true,
        maxLength: 100
    },
    // This connects each skill to its parent specialty
    specialty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialty',
        required: true
    },
    description: {
        type: String,
        trim: true,
        maxLength: 300
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Indexes for better performance (name already indexed via unique:true)
skillSchema.index({ specialty: 1 });
skillSchema.index({ isActive: 1 });

module.exports = mongoose.model('Skill', skillSchema);