const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const contactSchema = new Schema({
    // Full name of the person contacting
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Full name must be at least 2 characters'],
        maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    // Work email
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    // Company name
    company: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        maxlength: [200, 'Company name cannot exceed 200 characters']
    },
    // Job title / Role
    role: {
        type: String,
        required: [true, 'Job title/role is required'],
        trim: true,
        maxlength: [100, 'Role cannot exceed 100 characters']
    },
    // Phone number
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    // Country
    country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true
    },
    // LinkedIn profile (optional)
    linkedin: {
        type: String,
        trim: true,
        default: ''
    },
    // Status of the contact request
    status: {
        type: String,
        enum: ['new', 'in_progress', 'resolved', 'archived'],
        default: 'new'
    },
    // Admin notes
    adminNotes: {
        type: String,
        trim: true,
        default: ''
    },
    // Who handled this contact
    handledBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // When it was resolved
    resolvedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
