const PortfolioItem = require('../Models/PortfolioItems');
const mongoose = require('mongoose');

// Create portfolio item
const createPortfolioItem = async (req, res) => {
    try {
        const freelancerId = req.user.id;
        const { title, description, images, projectUrl, skills, dateCompleted } = req.body;

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
            projectUrl,
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
        const { freelancerId, skillId } = req.query;
        
        let query = {};
        if (freelancerId) query.freelancer = freelancerId;
        if (skillId) query.skills = skillId;

        const portfolioItems = await PortfolioItem.find(query)
            .populate('freelancer', 'first_name last_name profile_picture_url')
            .populate('skills', 'name')
            .sort({ createdAt: -1 });

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

        // Check ownership
        if (portfolioItem.freelancer.toString() !== freelancerId) {
            return res.status(403).json({ 
                message: 'You can only update your own portfolio items' 
            });
        }

        // Update fields
        const allowedFields = ['title', 'description', 'images', 'projectUrl', 'skills', 'dateCompleted'];
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

        // Check ownership
        if (portfolioItem.freelancer.toString() !== freelancerId) {
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

        const portfolioItem = await PortfolioItem.findById(id);

        if (!portfolioItem) {
            return res.status(404).json({ 
                message: 'Portfolio item not found' 
            });
        }

        portfolioItem.likes += 1;
        await portfolioItem.save();

        res.status(200).json({
            message: 'Portfolio item liked',
            likes: portfolioItem.likes
        });
    } catch (error) {
        console.error('Like portfolio item error:', error);
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
    likePortfolioItem
};
