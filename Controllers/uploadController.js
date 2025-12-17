const path = require('path');

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: 'No file uploaded'
            });
        }

        const fileUrl = `/uploads/profiles/${req.file.filename}`;

        res.status(200).json({
            message: 'Profile picture uploaded successfully',
            fileUrl: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Upload portfolio images
const uploadPortfolioImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: 'No files uploaded'
            });
        }

        const fileUrls = req.files.map(file => `/uploads/portfolio/${file.filename}`);

        res.status(200).json({
            message: 'Portfolio images uploaded successfully',
            fileUrls: fileUrls,
            count: fileUrls.length
        });
    } catch (error) {
        console.error('Upload portfolio images error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Upload attachments
const uploadAttachments = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: 'No files uploaded'
            });
        }

        const attachments = req.files.map(file => ({
            url: `/uploads/attachments/${file.filename}`,
            fileName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        }));

        res.status(200).json({
            message: 'Attachments uploaded successfully',
            attachments: attachments,
            count: attachments.length
        });
    } catch (error) {
        console.error('Upload attachments error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Delete file
const deleteFile = async (req, res) => {
    try {
        const fs = require('fs');
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({
                message: 'File path is required'
            });
        }

        // Remove leading slash and 'public' from path
        const fullPath = path.join(__dirname, '..', filePath.replace('/public/', 'Public/'));

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                message: 'File not found'
            });
        }

        // Delete file
        fs.unlinkSync(fullPath);

        res.status(200).json({
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    uploadProfilePicture,
    uploadPortfolioImages,
    uploadAttachments,
    deleteFile
};
