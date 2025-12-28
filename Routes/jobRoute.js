const express = require('express');
const router = express.Router();
// const {
//     createJob,
//     getAllJobs,
//     searchJobs,
//     getJobById,
//     updateJobById,
const { 
    createJob,
    updateJobEmbeddings, 
    recommendFreelancers,
    searchJobs, 
    getJobById, 
    updateJobById, 
    getAllJobs,
    getAllJobsForAdmin,
    createJobForAdmin,
    deleteJobById,
    incrementJobViews,
    getJobsByClient,
    getFeaturedJobs,
    closeJob,
    closeJobById,
    getJobContract
} = require('../Controllers/jobsController');
const authentic = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');
const optionalAuth = require('../middleware/optionalAuth');
const { validateJobCreation, validateMongoId } = require('../middleware/validation');
const { uploadJobAttachments } = require('../middleware/upload');

/**
 * @swagger
 * /Freelancing/api/v1/jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               client:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               specialty:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               budget:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [hourly, fixed]
 *                   amount:
 *                     type: number
 *     responses:
 *       201:
 *         description: Job created successfully
 */
router.post('/', authentic, uploadJobAttachments.array('attachments', 5), validateJobCreation, createJob);
router.post('/', authentic, validateJobCreation, createJob);


//route to update already existing jobs
router.post('/update-embeddings', authentic, validateJobCreation, updateJobEmbeddings);

//route get recommended freelancers based on similarity and freelancers rating
router.get('/recommend/:jobId', authentic, recommendFreelancers);

/**
 * Admin route - Create job with extended format support
 * Supports duration as {value, unit} object
 * MUST be before GET / to avoid route conflict
 */
router.post('/admin/create', authentic, authorize('admin'), uploadJobAttachments.array('attachments', 5), validateJobCreation, createJobForAdmin);

/**
 * Admin route - Get all jobs (all statuses)
 * MUST be before GET / to avoid route conflict
 */
router.get('/admin/all', authentic, authorize('admin'), getAllJobsForAdmin);

/**
 * @swagger
 * /Freelancing/api/v1/jobs:
 *   get:
 *     summary: Get all jobs
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 */
router.get('/', getAllJobs);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/search:
 *   get:
 *     summary: Search and filter jobs
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *       - in: query
 *         name: budgetType
 *         schema:
 *           type: string
 *           enum: [hourly, fixed]
 *       - in: query
 *         name: minBudget
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxBudget
 *         schema:
 *           type: number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', searchJobs);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 */
router.get('/:id', optionalAuth, getJobById);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/{id}:
 *   put:
 *     summary: Update job by ID
 *     tags: [Jobs]
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
 *             properties:
 *               client:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               specialty:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               budget:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [hourly, fixed]
 *                   amount:
 *                     type: number
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Job updated successfully
 */
router.put('/:id', authentic, uploadJobAttachments.array('attachments', 5), updateJobById);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/{id}:
 *   delete:
 *     summary: Delete job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted successfully
 */
router.delete('/:id', authentic, deleteJobById);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/{id}/close:
 *   patch:
 *     summary: Close a job (alternative to delete for jobs with proposals)
 *     tags: [Jobs]
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
 *         description: Job closed successfully
 */
router.patch('/:id/close', authentic, closeJobById);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/{id}/view:
 *   patch:
 *     summary: Increment job views
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: View count updated
 */
router.patch('/:id/view', incrementJobViews);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/client/{clientId}:
 *   get:
 *     summary: Get jobs by client
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Jobs fetched successfully
 */
router.get('/client/:clientId', optionalAuth, getJobsByClient);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/featured:
 *   get:
 *     summary: Get featured jobs
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Featured jobs fetched successfully
 */
router.get('/featured', getFeaturedJobs);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/{id}/close:
 *   patch:
 *     summary: Close job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job closed successfully
 */
router.patch('/:id/close', authentic, closeJob);

/**
 * @swagger
 * /Freelancing/api/v1/jobs/{jobId}/contract:
 *   get:
 *     summary: Get contract details for a job (in_progress or completed only)
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Contract details retrieved successfully
 *       403:
 *         description: Not authorized to view this contract
 *       404:
 *         description: Job or contract not found
 */
router.get('/:jobId/contract', authentic, getJobContract);

module.exports = router;