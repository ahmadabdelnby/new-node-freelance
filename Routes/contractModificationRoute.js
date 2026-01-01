const express = require('express');
const router = express.Router();
const {
    createModificationRequest,
    respondToModificationRequest,
    getModificationRequestsByContract,
    getMyModificationRequests,
    getModificationRequestById,
    cancelModificationRequest
} = require('../Controllers/contractModificationController');
const authentic = require('../middleware/authenticationMiddle');

/**
 * @swagger
 * tags:
 *   name: Contract Modifications
 *   description: Contract modification request management
 */

/**
 * @swagger
 * /Freelancing/api/v1/contract-modifications:
 *   post:
 *     summary: Create a new modification request (Freelancer only)
 *     tags: [Contract Modifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractId
 *               - modificationType
 *               - reason
 *             properties:
 *               contractId:
 *                 type: string
 *                 description: The contract ID to request modification for
 *               modificationType:
 *                 type: string
 *                 enum: [budget, deadline, both]
 *                 description: Type of modification requested
 *               requestedBudget:
 *                 type: number
 *                 description: New requested budget amount (required if modificationType is budget or both)
 *               requestedDeliveryTime:
 *                 type: number
 *                 description: New delivery time in days (required if modificationType is deadline or both)
 *               reason:
 *                 type: string
 *                 description: Reason for the modification request
 *     responses:
 *       201:
 *         description: Modification request created successfully
 *       400:
 *         description: Bad request or pending request exists
 *       403:
 *         description: Only freelancer can request modifications
 *       404:
 *         description: Contract not found
 */
router.post('/', authentic, createModificationRequest);

/**
 * @swagger
 * /Freelancing/api/v1/contract-modifications/my-requests:
 *   get:
 *     summary: Get all modification requests for current user
 *     tags: [Contract Modifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [freelancer, client]
 *         description: Filter by role (requests made or received)
 *     responses:
 *       200:
 *         description: List of modification requests
 */
router.get('/my-requests', authentic, getMyModificationRequests);

/**
 * @swagger
 * /Freelancing/api/v1/contract-modifications/contract/{contractId}:
 *   get:
 *     summary: Get all modification requests for a specific contract
 *     tags: [Contract Modifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     responses:
 *       200:
 *         description: List of modification requests for the contract
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Contract not found
 */
router.get('/contract/:contractId', authentic, getModificationRequestsByContract);

/**
 * @swagger
 * /Freelancing/api/v1/contract-modifications/{requestId}:
 *   get:
 *     summary: Get a specific modification request by ID
 *     tags: [Contract Modifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Modification request ID
 *     responses:
 *       200:
 *         description: Modification request details
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Request not found
 */
router.get('/:requestId', authentic, getModificationRequestById);

/**
 * @swagger
 * /Freelancing/api/v1/contract-modifications/{requestId}/respond:
 *   post:
 *     summary: Respond to a modification request (Client only - approve or reject)
 *     tags: [Contract Modifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Modification request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Action to take
 *               responseNote:
 *                 type: string
 *                 description: Optional note with the response
 *     responses:
 *       200:
 *         description: Response recorded successfully
 *       400:
 *         description: Invalid action or insufficient balance
 *       403:
 *         description: Only client can respond
 *       404:
 *         description: Request not found
 */
router.post('/:requestId/respond', authentic, respondToModificationRequest);

/**
 * @swagger
 * /Freelancing/api/v1/contract-modifications/{requestId}:
 *   delete:
 *     summary: Cancel a pending modification request (Freelancer only)
 *     tags: [Contract Modifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Modification request ID
 *     responses:
 *       200:
 *         description: Request cancelled successfully
 *       400:
 *         description: Can only cancel pending requests
 *       403:
 *         description: Only requester can cancel
 *       404:
 *         description: Request not found
 */
router.delete('/:requestId', authentic, cancelModificationRequest);

module.exports = router;
