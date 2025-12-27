const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, "../Public/uploads");
const profilesDir = path.join(uploadsDir, "profiles");

[uploadsDir, profilesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profilesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure storage for portfolio items
const portfolioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const portfolioDir = path.join(__dirname, "../Public/uploads/portfolio");
    if (!fs.existsSync(portfolioDir)) {
      fs.mkdirSync(portfolioDir, { recursive: true });
    }
    cb(null, portfolioDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "portfolio-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure storage for CV files
const cvStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const cvDir = path.join(__dirname, "../Public/uploads/cv");
    if (!fs.existsSync(cvDir)) {
      fs.mkdirSync(cvDir, { recursive: true });
    }
    cb(null, cvDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "cv-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure storage for job attachments
const attachmentStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const attachmentDir = path.join(__dirname, '../Public/uploads/attachments');
        if (!fs.existsSync(attachmentDir)) {
            fs.mkdirSync(attachmentDir, { recursive: true });
        }
        cb(null, attachmentDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to accept only images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

// File filter to accept only PDFs
const pdfFilter = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = file.mimetype === "application/pdf";

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"));
  }
};

// File filter for job attachments (documents and images)
const attachmentFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip', 'application/x-zip-compressed'
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, DOCX, JPG, PNG, and ZIP files are allowed'));
    }
};

// Multer instances
const uploadProfilePicture = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

const uploadPortfolioImage = multer({
  storage: portfolioStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

const uploadCV = multer({
  storage: cvStorage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

const uploadJobAttachments = multer({
    storage: attachmentStorage,
    fileFilter: attachmentFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max per file
    }
});

module.exports = {
  uploadProfilePicture,
  uploadPortfolioImage,
  uploadCV,
  uploadJobAttachments
};
