const PortfolioItem = require('../Models/PortfolioItems');
const mongoose = require('mongoose');

// Create portfolio item
const createPortfolioItem = async (req, res) => {
    try {
        const freelancerId = req.user.id;
        const { title, description, images, githubUrl, liveUrl, skills, dateCompleted } = req.body;

        // Validation
        if (!title || !description || !images || !skills || !dateCompleted) {
            return res.status(400).json({
                message: 'All required fields must be provided'
            });
        }

        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                message: 'At least one image is required'
            });
        }

        if (!Array.isArray(skills) || skills.length === 0) {
            return res.status(400).json({
                message: 'At least one skill is required'
            });
        }

        // Check if user already has 10 portfolio items
        const existingItemsCount = await PortfolioItem.countDocuments({ freelancer: freelancerId });
        if (existingItemsCount >= 10) {
            return res.status(400).json({
                message: 'Maximum 10 portfolio items allowed per user'
            });
        }

        const portfolioItem = await PortfolioItem.create({
            freelancer: freelancerId,
            title,
            description,
            images,
            githubUrl,
            liveUrl,
            skills,
            dateCompleted
        });

        await portfolioItem.populate('skills', 'name');

        res.status(201).json({
            message: 'Portfolio item created successfully',
            portfolioItem
        });
    } catch (error) {
        console.error('Create portfolio item error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get all portfolio items (public)
const getAllPortfolioItems = async (req, res) => {
    try {
        const { freelancerId, skillId, featured } = req.query;

        let query = {};
        if (freelancerId) query.freelancer = freelancerId;
        if (skillId) query.skills = skillId;
        if (featured === 'true') query.isFeatured = true;

        const portfolioItems = await PortfolioItem.find(query)
            .populate('freelancer', 'first_name last_name profile_picture_url')
            .populate('skills', 'name')
            .sort({ isFeatured: -1, views: -1, createdAt: -1 });

        res.status(200).json({
            count: portfolioItems.length,
            portfolioItems
        });
    } catch (error) {
        console.error('Get portfolio items error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get portfolio item by ID
const getPortfolioItemById = async (req, res) => {
    try {
        const { id } = req.params;

        const portfolioItem = await PortfolioItem.findById(id)
            .populate('freelancer', 'first_name last_name profile_picture_url email')
            .populate('skills', 'name');

        if (!portfolioItem) {
            return res.status(404).json({
                message: 'Portfolio item not found'
            });
        }

        // Increment views
        portfolioItem.views += 1;
        await portfolioItem.save();

        res.status(200).json(portfolioItem);
    } catch (error) {
        console.error('Get portfolio item error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get my portfolio items
const getMyPortfolioItems = async (req, res) => {
    try {
        const freelancerId = req.user.id;

        const portfolioItems = await PortfolioItem.find({ freelancer: freelancerId })
            .populate('skills', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: portfolioItems.length,
            portfolioItems
        });
    } catch (error) {
        console.error('Get my portfolio items error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Update portfolio item
const updatePortfolioItem = async (req, res) => {
    try {
        const { id } = req.params;
        const freelancerId = req.user.id;
        const updateData = req.body;

        const portfolioItem = await PortfolioItem.findById(id);

        if (!portfolioItem) {
            return res.status(404).json({
                message: 'Portfolio item not found'
            });
        }

        // Check ownership (allow admin to update any portfolio item)
        if (req.user.role !== 'admin' && portfolioItem.freelancer.toString() !== freelancerId) {
            return res.status(403).json({
                message: 'You can only update your own portfolio items'
            });
        }

        // Update fields
        const allowedFields = ['title', 'description', 'images', 'githubUrl', 'liveUrl', 'skills', 'dateCompleted'];
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                portfolioItem[field] = updateData[field];
            }
        });

        await portfolioItem.save();
        await portfolioItem.populate('skills', 'name');

        res.status(200).json({
            message: 'Portfolio item updated successfully',
            portfolioItem
        });
    } catch (error) {
        console.error('Update portfolio item error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Delete portfolio item
const deletePortfolioItem = async (req, res) => {
    try {
        const { id } = req.params;
        const freelancerId = req.user.id;

        const portfolioItem = await PortfolioItem.findById(id);

        if (!portfolioItem) {
            return res.status(404).json({
                message: 'Portfolio item not found'
            });
        }

        // Check ownership (allow admin to delete any portfolio item)
        if (req.user.role !== 'admin' && portfolioItem.freelancer.toString() !== freelancerId) {
            return res.status(403).json({
                message: 'You can only delete your own portfolio items'
            });
        }

        await portfolioItem.deleteOne();

        res.status(200).json({
            message: 'Portfolio item deleted successfully'
        });
    } catch (error) {
        console.error('Delete portfolio item error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Like portfolio item
const likePortfolioItem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const portfolioItem = await PortfolioItem.findById(id);

        if (!portfolioItem) {
            return res.status(404).json({
                message: 'Portfolio item not found'
            });
        }

        // If user is authenticated
        if (userId) {
            // Check if user already liked
            const alreadyLiked = portfolioItem.likedBy.includes(userId);

            if (alreadyLiked) {
                // Unlike: remove user from likedBy and decrement
                portfolioItem.likedBy = portfolioItem.likedBy.filter(
                    id => id.toString() !== userId
                );
                portfolioItem.likes = Math.max(0, portfolioItem.likes - 1);
            } else {
                // Like: add user to likedBy and increment
                portfolioItem.likedBy.push(userId);
                portfolioItem.likes += 1;
            }

            await portfolioItem.save();

            // Populate fields before sending
            await portfolioItem.populate('freelancer', 'first_name last_name profile_picture_url');
            await portfolioItem.populate('skills', 'name');

            res.status(200).json({
                message: alreadyLiked ? 'Portfolio item unliked' : 'Portfolio item liked',
                likes: portfolioItem.likes,
                isLiked: !alreadyLiked,
                portfolioItem: portfolioItem
            });
        } else {
            // Anonymous user - just increment
            portfolioItem.likes += 1;
            await portfolioItem.save();

            await portfolioItem.populate('freelancer', 'first_name last_name profile_picture_url');
            await portfolioItem.populate('skills', 'name');

            res.status(200).json({
                message: 'Portfolio item liked',
                likes: portfolioItem.likes,
                isLiked: true,
                portfolioItem: portfolioItem
            });
        }
    } catch (error) {
        console.error('Like portfolio item error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Increment views
const incrementViews = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id; // Optional authentication

        const portfolioItem = await PortfolioItem.findById(id);

        if (!portfolioItem) {
            return res.status(404).json({
                message: 'Portfolio item not found'
            });
        }

        // If user is authenticated
        if (userId) {
            // Don't count views from the owner
            if (portfolioItem.freelancer.toString() === userId) {
                return res.status(200).json({
                    message: 'Owner view not counted',
                    views: portfolioItem.views
                });
            }

            // Check if user already viewed this item
            if (portfolioItem.viewedBy.includes(userId)) {
                return res.status(200).json({
                    message: 'Already viewed',
                    views: portfolioItem.views
                });
            }

            // Add user to viewedBy and increment views
            portfolioItem.viewedBy.push(userId);
            portfolioItem.views += 1;
            await portfolioItem.save();
        } else {
            // Anonymous user - just increment
            portfolioItem.views += 1;
            await portfolioItem.save();
        }

        res.status(200).json({
            message: 'Views incremented',
            views: portfolioItem.views
        });
    } catch (error) {
        console.error('Increment views error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Toggle featured status (Owner only)
const toggleFeatured = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const portfolioItem = await PortfolioItem.findById(id);

        if (!portfolioItem) {
            return res.status(404).json({
                message: 'Portfolio item not found'
            });
        }

        // Check ownership
        if (portfolioItem.freelancer.toString() !== userId) {
            return res.status(403).json({
                message: 'Not authorized to update this portfolio item'
            });
        }

        portfolioItem.isFeatured = !portfolioItem.isFeatured;
        await portfolioItem.save();

        res.status(200).json({
            message: `Portfolio item ${portfolioItem.isFeatured ? 'featured' : 'unfeatured'} successfully`,
            isFeatured: portfolioItem.isFeatured
        });
    } catch (error) {
        console.error('Toggle featured error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    createPortfolioItem,
    getAllPortfolioItems,
    getPortfolioItemById,
    getMyPortfolioItems,
    updatePortfolioItem,
    deletePortfolioItem,
    likePortfolioItem,
    incrementViews,
    toggleFeatured
};
