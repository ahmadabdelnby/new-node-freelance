const express = require('express');
const router = express.Router();
const { 
    createJob,
    updateJobEmbeddings, 
    recommendFreelancers,
    getAllJobs, 
    searchJobs, 
    getJobById, 
    updateJobById, 
    deleteJobById,
    incrementJobViews,
    getJobsByClient,
    getFeaturedJobs,
    closeJob
} = require('../Controllers/jobsController');
const authentic = require('../middleware/authenticationMiddle');
const { validateJobCreation, validateMongoId } = require('../middleware/validation');

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
router.post('/', authentic, validateJobCreation, createJob);


//route to update already existing jobs
router.post('/update-embeddings', authentic, validateJobCreation, updateJobEmbeddings);

//route get recommended freelancers based on similarity and freelancers rating
router.get('/recommend/:jobId', authentic, recommendFreelancers);

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
router.get('/:id', getJobById);

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
router.put('/:id', authentic, updateJobById);

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
router.get('/client/:clientId', authentic, getJobsByClient);

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

module.exports = router;