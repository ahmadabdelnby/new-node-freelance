const express = require('express');
const router = express.Router();
const { getAllLogs, getLogById, getLogStats } = require('../Controllers/activityLogController');
const authentic = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/activity-logs:
 *   get:
 *     summary: Get all activity logs (admin only)
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [login, logout, create, update, delete, view, approve, reject, suspend, activate, settings_change, export, other]
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [user, job, proposal, contract, payment, category, skill, specialty, country, contact, platform_settings, system]
 *       - in: query
 *         name: admin
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of activity logs
 */
router.get('/', authentic, authorize('admin'), getAllLogs);

/**
 * @swagger
 * /Freelancing/api/v1/activity-logs/stats:
 *   get:
 *     summary: Get activity log statistics (admin only)
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity statistics
 */
router.get('/stats', authentic, authorize('admin'), getLogStats);

/**
 * @swagger
 * /Freelancing/api/v1/activity-logs/{id}:
 *   get:
 *     summary: Get activity log by ID (admin only)
 *     tags: [Activity Logs]
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
 *         description: Activity log details
 */
router.get('/:id', authentic, authorize('admin'), getLogById);

module.exports = router;
