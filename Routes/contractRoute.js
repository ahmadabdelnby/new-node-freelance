//ahmed-dev branch

const express = require('express');
const router = express.Router();
const { 
    createContract,
    getMyContracts, 
    getContractById, 
    updateContractById, 
    deleteContractById, 
    getAllContracts,
    completeContract,
    updateHoursWorked,
    submitWork,
    reviewWork
} = require('../Controllers/contractController');
const authentic = require('../middleware/authenticationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/contracts:
 *   post:
 *     summary: Create a new contract
 *     tags: [Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               job:
 *                 type: string
 *               client:
 *                 type: string
 *               freelancer:
 *                 type: string
 *               proposal:
 *                 type: string
 *               agreedAmount:
 *                 type: number
 *               budgetType:
 *                 type: string
 *                 enum: [hourly, fixed]
 *     responses:
 *       201:
 *         description: Contract created successfully
 *       500:
 *         description: Internal server error
 */
router.post('/', authentic, createContract);

/**
 * @swagger
 * /Freelancing/api/v1/contracts:
 *   get:
 *     summary: Get all contracts
 *     tags: [Contracts]
 *     responses:
 *       200:
 *         description: List of contracts
 *       500:
 *         description: Internal server error
 */
router.get('/', authentic, getAllContracts);


router.get('/mycontracts', authentic, getMyContracts);


/**
 * @swagger
 * /Freelancing/api/v1/contracts/{id}:
 *   get:
 *     summary: Get contract by ID
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Contract ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract details
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authentic, getContractById);

/**
 * @swagger
 * /Freelancing/api/v1/contracts/{id}:
 *   put:
 *     summary: Update contract by ID
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Contract ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               job:
 *                 type: string
 *               client:
 *                 type: string
 *               freelancer:
 *                 type: string
 *               proposal:
 *                 type: string
 *               agreedAmount:
 *                 type: number
 *               budgetType:
 *                 type: string
 *                 enum: [hourly, fixed]
 *     responses:
 *       200:
 *         description: Contract updated successfully
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authentic, updateContractById);

/**
 * @swagger
 * /Freelancing/api/v1/contracts/{id}:
 *   delete:
 *     summary: Delete contract by ID
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Contract ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract deleted successfully
 *       404:
 *         description: Contract not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authentic, deleteContractById);

/**
 * @swagger
 * /Freelancing/api/v1/contracts/{id}/complete:
 *   patch:
 *     summary: Complete contract
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Contract ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contract completed successfully
 */
router.patch('/:id/complete', authentic, completeContract);

/**
 * @swagger
 * /Freelancing/api/v1/contracts/{id}/hours:
 *   patch:
 *     summary: Update hours worked
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Contract ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hoursWorked:
 *                 type: number
 *     responses:
 *       200:
 *         description: Hours worked updated successfully
 */
router.patch('/:id/hours', authentic, updateHoursWorked);

/**
 * @swagger
 * /Freelancing/api/v1/contracts/{id}/submit-work:
 *   post:
 *     summary: Submit work deliverables (Freelancer only)
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *                     size:
 *                       type: number
 *                     type:
 *                       type: string
 *     responses:
 *       200:
 *         description: Work submitted successfully
 */
router.post('/:contractId/submit-work', authentic, submitWork);

/**
 * @swagger
 * /Freelancing/api/v1/contracts/{contractId}/review/{deliverableId}:
 *   patch:
 *     summary: Review work (Accept or Request Revision) - Client only
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract ID
 *       - in: path
 *         name: deliverableId
 *         required: true
 *         schema:
 *           type: string
 *         description: Deliverable ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, request_revision]
 *               revisionNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Work reviewed successfully
 */
router.patch('/:contractId/review/:deliverableId', authentic, reviewWork);

module.exports = router;