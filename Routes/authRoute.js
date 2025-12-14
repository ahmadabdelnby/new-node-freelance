const express = require('express');
const router = express.Router();
const {
    register, 
    login, 
    adminDashboard,
    userDashboard,
    profile,
    forgotPassword,
    verifyResetToken,
    resetPassword
} = require('../Controllers/userController');
const authentic = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../middleware/validation');






/**
 * @swagger
 * /Freelancing/api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               profile_picture_url:
 *                 type: string
 *               country:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', authLimiter, validateRegistration, register);

/**
 * @swagger
 * /Freelancing/api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', authLimiter, validateLogin, login);

/**
 * @swagger
 * /Freelancing/api/v1/auth/admin-dashboard:
 *   get:
 *     summary: Get admin dashboard data
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Admin dashboard data retrieved successfully
 */
router.get('/admin-dashboard', authentic, authorize('admin'),adminDashboard);

/**
 * @swagger
 * /Freelancing/api/v1/auth/user-dashboard:
 *   get:
 *     summary: Get user dashboard data
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User dashboard data retrieved successfully
 */
router.get('/user-dashboard', authentic, authorize('user'),userDashboard);

/**
 * @swagger
 * /Freelancing/api/v1/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get('/profile', authentic, profile);

/**
 * @swagger
 * /Freelancing/api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

/**
 * @swagger
 * /Freelancing/api/v1/auth/verify-reset-token/{token}:
 *   get:
 *     summary: Verify password reset token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token is valid
 */
router.get('/verify-reset-token/:token', verifyResetToken);

/**
 * @swagger
 * /Freelancing/api/v1/auth/reset-password/{token}:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
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
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post('/reset-password/:token', resetPassword);

module.exports = router;


//add for test