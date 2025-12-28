const express = require('express');
const router = express.Router();
const {
    createPayment,
    processPayment,
    getPaymentById,
    getMyPayments,
    refundPayment,
    getAllPayments,
    getAllPaymentsForAdmin,
    holdPayment,
    releasePayment
} = require('../Controllers/paymentController');
const authenticate = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');

// Admin routes - must come before other routes
// GET /api/payments/admin/all - get all payments with full details (admin)
router.get('/admin/all', authenticate, authorize('admin'), getAllPaymentsForAdmin);

/**
 * @swagger
 * /Freelancing/api/v1/payments:
 *   post:
 *     summary: Create a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, paypal, bank_transfer, wallet]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment created successfully
 */
router.post('/', authenticate, createPayment);

/**
 * @swagger
 * /Freelancing/api/v1/payments/{paymentId}/process:
 *   post:
 *     summary: Process a payment (mock)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment processed
 */
router.post('/:paymentId/process', authenticate, processPayment);

/**
 * @swagger
 * /Freelancing/api/v1/payments/mine:
 *   get:
 *     summary: Get my payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [sent, received]
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/mine', authenticate, getMyPayments);

/**
 * @swagger
 * /Freelancing/api/v1/payments:
 *   get:
 *     summary: Get all payments (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 */
router.get('/', authenticate, authorize('admin'), getAllPayments);

/**
 * @swagger
 * /Freelancing/api/v1/payments/{paymentId}:
 *   get:
 *     summary: Get payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
 */
router.get('/:paymentId', authenticate, getPaymentById);

/**
 * @swagger
 * /Freelancing/api/v1/payments/{paymentId}/refund:
 *   post:
 *     summary: Refund a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment refunded successfully
 */
router.post('/:paymentId/refund', authenticate, refundPayment);

/**
 * @swagger
 * /Freelancing/api/v1/payments/escrow/hold:
 *   post:
 *     summary: Hold payment in escrow (when accepting proposal)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment held in escrow successfully
 */
router.post('/escrow/hold', authenticate, holdPayment);

/**
 * @swagger
 * /Freelancing/api/v1/payments/escrow/release:
 *   post:
 *     summary: Release payment from escrow to freelancer (when completing contract)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment released successfully
 */
router.post('/escrow/release', authenticate, releasePayment);

module.exports = router;
