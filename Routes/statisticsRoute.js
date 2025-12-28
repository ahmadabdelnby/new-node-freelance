const express = require('express');
const router = express.Router();
const {
    getPlatformStatistics,
    getGrowthData,
    getUserDashboard,
    getChartData
} = require('../Controllers/statisticsController');
const authenticate = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/statistics/platform:
 *   get:
 *     summary: Get platform statistics (admin only)
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/platform', authenticate, authorize('admin'), getPlatformStatistics);

/**
 * @swagger
 * /Freelancing/api/v1/statistics/growth:
 *   get:
 *     summary: Get growth data for charts
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *     responses:
 *       200:
 *         description: Growth data retrieved successfully
 */
router.get('/growth', authenticate, authorize('admin'), getGrowthData);

/**
 * @swagger
 * /Freelancing/api/v1/statistics/charts:
 *   get:
 *     summary: Get formatted chart data for dashboard
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart data retrieved successfully
 */
router.get('/charts', authenticate, authorize('admin'), getChartData);

/**
 * @swagger
 * /Freelancing/api/v1/statistics/dashboard:
 *   get:
 *     summary: Get user dashboard statistics
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get('/dashboard', authenticate, getUserDashboard);

module.exports = router;
