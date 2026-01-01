const express = require('express');
const router = express.Router();
const {
    getMyOpenJobs,
    sendInvitation,
    getMyInvitations,
    updateInvitationStatus
} = require('../Controllers/jobInvitationController');
const authentic = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/job-invitations/my-open-jobs:
 *   get:
 *     summary: Get client's open jobs for invitation modal
 *     tags: [Job Invitations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of open jobs
 */
router.get('/my-open-jobs', authentic, getMyOpenJobs);

/**
 * @swagger
 * /Freelancing/api/v1/job-invitations/send:
 *   post:
 *     summary: Send job invitation to a freelancer
 *     tags: [Job Invitations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - freelancerId
 *               - jobIds
 *             properties:
 *               freelancerId:
 *                 type: string
 *               jobIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 */
router.post('/send', authentic, sendInvitation);

/**
 * @swagger
 * /Freelancing/api/v1/job-invitations/my-invitations:
 *   get:
 *     summary: Get invitations received by freelancer
 *     tags: [Job Invitations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, viewed, accepted, declined]
 *     responses:
 *       200:
 *         description: List of invitations
 */
router.get('/my-invitations', authentic, authorize('freelancer'), getMyInvitations);

/**
 * @swagger
 * /Freelancing/api/v1/job-invitations/{invitationId}/status:
 *   patch:
 *     summary: Update invitation status
 *     tags: [Job Invitations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [viewed, accepted, declined]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:invitationId/status', authentic, authorize('freelancer'), updateInvitationStatus);

module.exports = router;
