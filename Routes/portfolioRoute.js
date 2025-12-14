const express = require('express');
const router = express.Router();
const {
    createPortfolioItem,
    getAllPortfolioItems,
    getPortfolioItemById,
    getMyPortfolioItems,
    updatePortfolioItem,
    deletePortfolioItem,
    likePortfolioItem
} = require('../Controllers/portfolioController');
const authenticate = require('../middleware/authenticationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/portfolio:
 *   post:
 *     summary: Create a portfolio item
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               projectUrl:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               dateCompleted:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Portfolio item created successfully
 */
router.post('/', authenticate, createPortfolioItem);

/**
 * @swagger
 * /Freelancing/api/v1/portfolio:
 *   get:
 *     summary: Get all portfolio items
 *     tags: [Portfolio]
 *     parameters:
 *       - in: query
 *         name: freelancerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: skillId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Portfolio items retrieved successfully
 */
router.get('/', getAllPortfolioItems);

/**
 * @swagger
 * /Freelancing/api/v1/portfolio/mine:
 *   get:
 *     summary: Get my portfolio items
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My portfolio items retrieved successfully
 */
router.get('/mine', authenticate, getMyPortfolioItems);

/**
 * @swagger
 * /Freelancing/api/v1/portfolio/{id}:
 *   get:
 *     summary: Get portfolio item by ID
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Portfolio item retrieved successfully
 */
router.get('/:id', getPortfolioItemById);

/**
 * @swagger
 * /Freelancing/api/v1/portfolio/{id}:
 *   put:
 *     summary: Update portfolio item
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Portfolio item updated successfully
 */
router.put('/:id', authenticate, updatePortfolioItem);

/**
 * @swagger
 * /Freelancing/api/v1/portfolio/{id}:
 *   delete:
 *     summary: Delete portfolio item
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Portfolio item deleted successfully
 */
router.delete('/:id', authenticate, deletePortfolioItem);

/**
 * @swagger
 * /Freelancing/api/v1/portfolio/{id}/like:
 *   post:
 *     summary: Like a portfolio item
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Portfolio item liked
 */
router.post('/:id/like', likePortfolioItem);

module.exports = router;
