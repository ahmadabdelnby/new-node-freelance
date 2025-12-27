const express = require('express');
const router = express.Router();
const {
    createPayPalOrder,
    capturePayPalOrder,
    addFundsMock,
    withdrawFunds
} = require('../Controllers/fundsController');
const authenticate = require('../middleware/authenticationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/funds/paypal/create-order:
 *   post:
 *     summary: Create PayPal order for adding funds
 *     tags: [Funds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to add (min $10, max $10,000)
 *     responses:
 *       200:
 *         description: PayPal order created successfully
 */
router.post('/paypal/create-order', authenticate, createPayPalOrder);

/**
 * @swagger
 * /Freelancing/api/v1/funds/paypal/capture-order:
 *   post:
 *     summary: Capture PayPal order and add funds to balance
 *     tags: [Funds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: PayPal order ID
 *     responses:
 *       200:
 *         description: Funds added successfully
 */
router.post('/paypal/capture-order', authenticate, capturePayPalOrder);

/**
 * @swagger
 * /Freelancing/api/v1/funds/add-mock:
 *   post:
 *     summary: Add funds to account (mock - for testing)
 *     tags: [Funds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Funds added successfully
 */
router.post('/add-mock', authenticate, addFundsMock);

/**
 * @swagger
 * /Freelancing/api/v1/funds/withdraw:
 *   post:
 *     summary: Withdraw funds to PayPal account
 *     tags: [Funds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paypalEmail
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to withdraw (min $10)
 *               paypalEmail:
 *                 type: string
 *                 description: PayPal email address to receive funds
 *     responses:
 *       200:
 *         description: Withdrawal processed successfully
 *       400:
 *         description: Invalid request or insufficient balance
 */
router.post('/withdraw', authenticate, withdrawFunds);

// Legacy route (for backward compatibility)
router.post('/add', authenticate, addFundsMock);

module.exports = router;
