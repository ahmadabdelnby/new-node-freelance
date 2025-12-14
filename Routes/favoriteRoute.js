const express = require('express');
const router = express.Router();
const {
    addToFavorites,
    removeFromFavorites,
    getMyFavorites,
    checkFavorite
} = require('../Controllers/favoritesController');
const authenticate = require('../middleware/authenticationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/favorites:
 *   post:
 *     summary: Add item to favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *               itemModel:
 *                 type: string
 *                 enum: [User, Job, PortfolioItem]
 *     responses:
 *       201:
 *         description: Added to favorites successfully
 */
router.post('/', authenticate, addToFavorites);

/**
 * @swagger
 * /Freelancing/api/v1/favorites:
 *   delete:
 *     summary: Remove item from favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *               itemModel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Removed from favorites successfully
 */
router.delete('/', authenticate, removeFromFavorites);

/**
 * @swagger
 * /Freelancing/api/v1/favorites/mine:
 *   get:
 *     summary: Get user's favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [User, Job, PortfolioItem]
 *     responses:
 *       200:
 *         description: Favorites retrieved successfully
 */
router.get('/mine', authenticate, getMyFavorites);

/**
 * @swagger
 * /Freelancing/api/v1/favorites/check:
 *   get:
 *     summary: Check if item is favorited
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: itemModel
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Check result
 */
router.get('/check', authenticate, checkFavorite);

module.exports = router;
