const express = require('express');
const router = express.Router();
const { 
    deleteUserById, 
    getAllUsers,
    getUserById,
    updateUserById, 
    updateProfilePicture,
    changePassword,
    updateOnlineStatus,
    getUserStatistics,
    getProfileCompletion
} = require('../Controllers/userController');
const authentic = require('../middleware/authenticationMiddle');
const authorize = require('../middleware/authorizationMiddle');
const { uploadProfilePicture } = require('../middleware/upload');
const { validateChangePassword, validateMongoId, validateProfileUpdate } = require('../middleware/validation');

/**
 * @swagger
 * /Freelancing/api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/', getAllUsers);

/**
 * @swagger
 * /Freelancing/api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 */
router.get('/:id', validateMongoId, getUserById);

/**
 * @swagger
 * /Freelancing/api/v1/users/{id}:
 *   put:
 *     summary: Update user by ID
 *     tags: [Users]
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
 *       200:
 *         description: User updated successfully
 */
router.put('/:id', authentic, validateMongoId, validateProfileUpdate, updateUserById);

/**
 * @swagger
 * /Freelancing/api/v1/users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete('/:id', authentic, authorize('admin'), deleteUserById);

/**
 * @swagger
 * /Freelancing/api/v1/users/profile/picture:
 *   put:
 *     summary: Update user profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 */
router.put('/profile/picture', authentic, uploadProfilePicture.single('profile_picture'), updateProfilePicture);

/**
 * @swagger
 * /Freelancing/api/v1/users/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post('/change-password', authentic, validateChangePassword, changePassword);

/**
 * @swagger
 * /Freelancing/api/v1/users/online-status:
 *   patch:
 *     summary: Update user online status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isOnline:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Online status updated
 */
router.patch('/online-status', authentic, updateOnlineStatus);

/**
 * @swagger
 * /Freelancing/api/v1/users/statistics:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics', authentic, getUserStatistics);

/**
 * @swagger
 * /Freelancing/api/v1/users/profile-completion:
 *   get:
 *     summary: Get profile completion percentage
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completion retrieved successfully
 */
router.get('/profile-completion', authentic, getProfileCompletion);

module.exports = router;
