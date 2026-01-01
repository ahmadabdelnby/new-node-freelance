const express = require('express');
const router = express.Router();
const {
    createContact,
    getAllContacts,
    getContactById,
    updateContactStatus,
    deleteContact,
    getContactStats
} = require('../Controllers/contactController');
const authentic = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/contacts:
 *   post:
 *     summary: Submit a contact form (public)
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - company
 *               - role
 *               - phone
 *               - country
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               company:
 *                 type: string
 *               role:
 *                 type: string
 *               phone:
 *                 type: string
 *               country:
 *                 type: string
 *               linkedin:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contact submitted successfully
 */
router.post('/', createContact);

/**
 * @swagger
 * /Freelancing/api/v1/contacts:
 *   get:
 *     summary: Get all contacts (admin only)
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, in_progress, resolved, archived]
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
 *         description: List of contacts
 */
router.get('/', authentic, authorize('admin'), getAllContacts);

/**
 * @swagger
 * /Freelancing/api/v1/contacts/stats:
 *   get:
 *     summary: Get contact statistics (admin only)
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact statistics
 */
router.get('/stats', authentic, authorize('admin'), getContactStats);

/**
 * @swagger
 * /Freelancing/api/v1/contacts/{id}:
 *   get:
 *     summary: Get contact by ID (admin only)
 *     tags: [Contacts]
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
 *         description: Contact details
 */
router.get('/:id', authentic, authorize('admin'), getContactById);

/**
 * @swagger
 * /Freelancing/api/v1/contacts/{id}:
 *   patch:
 *     summary: Update contact status (admin only)
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, in_progress, resolved, archived]
 *               adminNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact updated successfully
 */
router.patch('/:id', authentic, authorize('admin'), updateContactStatus);

/**
 * @swagger
 * /Freelancing/api/v1/contacts/{id}:
 *   delete:
 *     summary: Delete contact (admin only)
 *     tags: [Contacts]
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
 *         description: Contact deleted successfully
 */
router.delete('/:id', authentic, authorize('admin'), deleteContact);

module.exports = router;
