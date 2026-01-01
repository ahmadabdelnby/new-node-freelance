const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../Controllers/platformSettingsController');
const authentic = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/platform-settings:
 *   get:
 *     summary: Get platform settings (admin only)
 *     tags: [Platform Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform settings
 */
router.get('/', authentic, authorize('admin'), getSettings);

/**
 * @swagger
 * /Freelancing/api/v1/platform-settings:
 *   patch:
 *     summary: Update platform settings (admin only)
 *     tags: [Platform Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commissionRate:
 *                 type: number
 *               minProjectBudget:
 *                 type: number
 *               maxProjectBudget:
 *                 type: number
 *               minWithdrawal:
 *                 type: number
 *               maxWithdrawal:
 *                 type: number
 *               maxProposalsPerJob:
 *                 type: number
 *               maxActiveJobsPerClient:
 *                 type: number
 *               maxActiveContractsPerFreelancer:
 *                 type: number
 *               proposalExpirationDays:
 *                 type: number
 *               contractDeadlineExtensionDays:
 *                 type: number
 *               allowNewRegistrations:
 *                 type: boolean
 *               requireEmailVerification:
 *                 type: boolean
 *               enableWithdrawals:
 *                 type: boolean
 *               maintenanceMode:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.patch('/', authentic, authorize('admin'), updateSettings);

module.exports = router;
