const express = require("express");
const router = express.Router();
const {
  uploadProfilePicture: uploadProfilePictureController,
  uploadPortfolioImages: uploadPortfolioImagesController,
  uploadAttachments: uploadAttachmentsController,
  deleteFile,
  parseCV,
  downloadAttachment,
} = require("../Controllers/uploadController");
const {
  uploadProfilePicture,
  uploadPortfolioImages,
  uploadAttachments,
} = require("../middleware/uploadMiddleware");
const { uploadCV } = require("../middleware/upload");
const authenticate = require("../middleware/authenticationMiddle");

/**
 * @swagger
 * /Freelancing/api/v1/upload/profile-picture:
 *   post:
 *     summary: Upload profile picture
 *     tags: [Upload]
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
 *         description: Profile picture uploaded successfully
 */
router.post(
  "/profile-picture",
  authenticate,
  uploadProfilePicture,
  uploadProfilePictureController
);

/**
 * @swagger
 * /Freelancing/api/v1/upload/portfolio-images:
 *   post:
 *     summary: Upload portfolio images
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               portfolioImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Portfolio images uploaded successfully
 */
router.post(
  "/portfolio-images",
  authenticate,
  uploadPortfolioImages,
  uploadPortfolioImagesController
);

/**
 * @swagger
 * /Freelancing/api/v1/upload/attachments:
 *   post:
 *     summary: Upload attachments
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Attachments uploaded successfully
 */
router.post(
  "/attachments",
  authenticate,
  uploadAttachments,
  uploadAttachmentsController
);

/**
 * Download attachment with original filename
 * Example: GET /Freelancing/api/v1/upload/attachments/download?filePath=/uploads/attachments/attachment-123.zip&originalName=original.zip
 */
router.get('/attachments/download', downloadAttachment);

/**
 * @swagger
 * /Freelancing/api/v1/upload/delete:
 *   delete:
 *     summary: Delete a file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filePath:
 *                 type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete("/delete", authenticate, deleteFile);

/**
 * @swagger
 * /Freelancing/api/v1/upload/parse-cv:
 *   post:
 *     summary: Upload and parse CV to extract data
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cv:
 *                 type: string
 *                 format: binary
 *                 description: PDF file of the CV
 *     responses:
 *       200:
 *         description: CV parsed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     fullName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                     summary:
 *                       type: string
 */
router.post("/parse-cv", authenticate, uploadCV.single("cv"), parseCV);

module.exports = router;
