const Favorite = require('../Models/Favorites');
const mongoose = require('mongoose');

// Add to favorites
const addToFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, itemModel } = req.body;

        // Validate input
        if (!itemId || !itemModel) {
            return res.status(400).json({ 
                message: 'itemId and itemModel are required' 
            });
        }

        // Validate itemModel
        const validModels = ['User', 'Job', 'PortfolioItem'];
        if (!validModels.includes(itemModel)) {
            return res.status(400).json({ 
                message: `itemModel must be one of: ${validModels.join(', ')}` 
            });
        }

        // Check if already favorited
        const existingFavorite = await Favorite.findOne({
            user: userId,
            item: itemId,
            itemModel: itemModel
        });

        if (existingFavorite) {
            return res.status(400).json({ 
                message: 'Item already in favorites' 
            });
        }

        // Create favorite
        const favorite = await Favorite.create({
            user: userId,
            item: itemId,
            itemModel: itemModel
        });

        res.status(201).json({
            message: 'Added to favorites successfully',
            favorite
        });
    } catch (error) {
        console.error('Add to favorites error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Remove from favorites
const removeFromFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, itemModel } = req.body;

        if (!itemId || !itemModel) {
            return res.status(400).json({ 
                message: 'itemId and itemModel are required' 
            });
        }

        const favorite = await Favorite.findOneAndDelete({
            user: userId,
            item: itemId,
            itemModel: itemModel
        });

        if (!favorite) {
            return res.status(404).json({ 
                message: 'Favorite not found' 
            });
        }

        res.status(200).json({
            message: 'Removed from favorites successfully'
        });
    } catch (error) {
        console.error('Remove from favorites error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get user's favorites
const getMyFavorites = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query; // Optional filter by type

        let query = { user: userId };
        if (type) {
            query.itemModel = type;
        }

        const favorites = await Favorite.find(query)
            .populate('item')
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: favorites.length,
            favorites
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Check if item is favorited
const checkFavorite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, itemModel } = req.query;

        if (!itemId || !itemModel) {
            return res.status(400).json({ 
                message: 'itemId and itemModel are required' 
            });
        }

        const favorite = await Favorite.findOne({
            user: userId,
            item: itemId,
            itemModel: itemModel
        });

        res.status(200).json({
            isFavorited: !!favorite
        });
    } catch (error) {
        console.error('Check favorite error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

module.exports = {
    addToFavorites,
    removeFromFavorites,
    getMyFavorites,
    checkFavorite
};
