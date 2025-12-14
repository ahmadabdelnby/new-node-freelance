const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
    'Public/uploads/profiles',
    'Public/uploads/portfolio',
    'Public/uploads/attachments'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'Public/uploads/';
        
        // Determine upload path based on fieldname
        if (file.fieldname === 'profilePicture') {
            uploadPath += 'profiles/';
        } else if (file.fieldname === 'portfolioImages') {
            uploadPath += 'portfolio/';
        } else if (file.fieldname === 'attachments') {
            uploadPath += 'attachments/';
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, nameWithoutExt + '-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Allowed image types
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    // Allowed document types
    const allowedDocTypes = /pdf|doc|docx|txt/;
    
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    
    if (file.fieldname === 'profilePicture' || file.fieldname === 'portfolioImages') {
        // Check if image
        if (allowedImageTypes.test(extname) && mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    } else if (file.fieldname === 'attachments') {
        // Allow both images and documents
        const isImage = allowedImageTypes.test(extname) && mimetype.startsWith('image/');
        const isDoc = allowedDocTypes.test(extname);
        
        if (isImage || isDoc) {
            cb(null, true);
        } else {
            cb(new Error('Only images and documents are allowed'));
        }
    } else {
        cb(new Error('Unexpected field'));
    }
};

// Multer upload configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: fileFilter
});

// Upload middleware for different purposes
const uploadProfilePicture = upload.single('profilePicture');
const uploadPortfolioImages = upload.array('portfolioImages', 10); // Max 10 images
const uploadAttachments = upload.array('attachments', 5); // Max 5 attachments
const uploadMultiple = upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'portfolioImages', maxCount: 10 },
    { name: 'attachments', maxCount: 5 }
]);

module.exports = {
    uploadProfilePicture,
    uploadPortfolioImages,
    uploadAttachments,
    uploadMultiple,
    upload
};
