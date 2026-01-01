const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxLength: 255,
        validate: {
            validator: function (email) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Please enter a valid email address'
        }
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: 3,
        maxLength: 50,
        validate: {
            validator: function (username) {
                return /^[a-zA-Z0-9_]+$/.test(username);
            },
            message: 'Username can only contain letters, numbers, and underscores'
        }
    },
    password: {
        type: String,
        required: true
    },
    confirmPassword: {
        type: String,
        required: true,
        validate: {
            validator: function (confirmPassword) {
                return confirmPassword === this.password;
            },
            message: 'Passwords do not match'
        }
    },
    first_name: {
        type: String,
        required: true,
        trim: true,
        minLength: 3,
        maxLength: 100
    },
    last_name: {
        type: String,
        required: true,
        trim: true,
        minLength: 3,
        maxLength: 100
    },
    profile_picture: {
        type: String,
        default: null,
        maxLength: 500
    },
    phone_number: {
        type: String,
        default: null,
        required: false,
        trim: true,
        maxLength: 20
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true,
        default: null
    },
    birthdate: {
        type: Date,
        default: null
    },
    country: {
        type: String,
        required: true,
        default: null,
        trim: true,
        maxLength: 100
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    aboutMe: {
        type: String,
        default: null,
        minLength: 50,
        maxLength: 2000,
        trim: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    specialty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialty'
    },
    skills: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Skill'
        }
    ],
    contracts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contract'
        }
    ],
    rehireRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    completedJobs: {
        type: Number,
        default: 0,
        min: 0
    },
    completedJobsAsClient: {
        type: Number,
        default: 0,
        min: 0
    },
    totalSpent: {
        type: Number,
        default: 0,
        min: 0
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0,
        min: 0
    },
    // Verification fields
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    isIdentityVerified: {
        type: Boolean,
        default: false
    },
    // New fields for better user experience
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    hourlyRate: {
        type: Number,
        min: 0,
        default: null
    },
    totalEarnings: {
        type: Number,
        default: 0,
        min: 0
    },
    balance: {
        type: Number,
        default: 1000, // Default balance for testing
        min: 0
    },
    responseTime: {
        type: Number, // in minutes (average response time)
        default: null,
        min: 0
    },
    responseTimeCount: {
        type: Number, // number of responses used to calculate average
        default: 0,
        min: 0
    },
    // Social links
    socialLinks: {
        linkedin: {
            type: String,
            trim: true
        },
        github: {
            type: String,
            trim: true
        },
        portfolio: {
            type: String,
            trim: true
        },
        twitter: {
            type: String,
            trim: true
        }
    },
    // Languages spoken
    languages: [{
        name: {
            type: String,
            required: true
        },
        proficiency: {
            type: String,
            enum: ['basic', 'conversational', 'fluent', 'native'],
            required: true
        }
    }],
    // Availability
    availability: {
        type: String,
        enum: ['available', 'busy', 'not_available'],
        default: 'available'
    },
    timezone: {
        type: String,
        default: 'UTC'
    }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual field for profile picture URL with full path
userSchema.virtual('profile_picture_url').get(function () {
    if (!this.profile_picture) return null;

    // If already a full URL, return as is
    if (this.profile_picture.startsWith('http://') || this.profile_picture.startsWith('https://')) {
        return this.profile_picture;
    }

    // Otherwise, construct full URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    // Remove leading slash if exists to avoid double slashes
    const path = this.profile_picture.startsWith('/') ? this.profile_picture.substring(1) : this.profile_picture;
    return `${baseUrl}/${path}`;
});

// Indexes for better query performance (email & username already indexed via unique:true)
userSchema.index({ category: 1 });
userSchema.index({ specialty: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ availability: 1 });
userSchema.index({ createdAt: -1 });

// Update lastSeen when user performs any action
userSchema.methods.updateLastSeen = function () {
    this.lastSeen = new Date();
    return this.save();
};

userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});
userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
//module.exports = mongoose.model('User', userSchema);