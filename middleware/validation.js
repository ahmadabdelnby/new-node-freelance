const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ Validation Errors:', JSON.stringify(errors.array(), null, 2));
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    console.log('✅ Validation passed');
    next();
};

// User registration validation
const validateRegistration = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
    body('first_name')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ max: 50 })
        .withMessage('First name must not exceed 50 characters'),
    body('last_name')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ max: 50 })
        .withMessage('Last name must not exceed 50 characters'),
    body('phone_number')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Phone number must not exceed 20 characters'),
    body('gender')
        .optional()
        .isIn(['male', 'female'])
        .withMessage('Gender must be either male or female'),
    body('country')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Country must not exceed 100 characters'),
    body('role')
        .optional()
        .isIn(['user', 'admin', 'client', 'freelancer'])
        .withMessage('Role must be user, admin, client, or freelancer'),
    validate
];

// User login validation
const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    validate
];

// Change password validation
const validateChangePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match'),
    validate
];

// Job creation validation
const validateJobCreation = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Job title is required')
        .isLength({ max: 200 })
        .withMessage('Title must not exceed 200 characters'),
    body('description')
        .trim()
        .isLength({ min: 50, max: 5000 })
        .withMessage('Description must be between 50 and 5000 characters'),
    body('specialty')
        .notEmpty()
        .withMessage('Specialty is required')
        .isMongoId()
        .withMessage('Invalid specialty ID'),
    // 🔥 Skills can be array (JSON) or string (FormData) - validate after parsing
    body('skills')
        .optional()
        .custom((value) => {
            // If string (FormData), it will be parsed in controller
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed);
                } catch (e) {
                    return false;
                }
            }
            // If already array (JSON), validate directly
            return Array.isArray(value);
        })
        .withMessage('Skills must be an array'),
    // 🔥 Budget can be object (JSON) or string (FormData)
    body('budget')
        .custom((value) => {
            let budgetObj = value;
            // If string (FormData), parse it
            if (typeof value === 'string') {
                try {
                    budgetObj = JSON.parse(value);
                } catch (e) {
                    return false;
                }
            }
            // Validate structure
            return budgetObj &&
                ['hourly', 'fixed'].includes(budgetObj.type) &&
                typeof budgetObj.amount === 'number' &&
                budgetObj.amount >= 0;
        })
        .withMessage('Budget must have valid type (hourly/fixed) and positive amount'),
    body('duration')
        .optional()
        .custom((value) => {
            // Allow both formats: number or {value: number, unit: string}
            if (typeof value === 'number') {
                return Number.isInteger(value) && value >= 1;
            }
            if (typeof value === 'string') {
                const num = parseInt(value);
                return Number.isInteger(num) && num >= 1;
            }
            if (typeof value === 'object' && value !== null) {
                return (
                    typeof value.value === 'number' &&
                    Number.isInteger(value.value) &&
                    value.value >= 1 &&
                    typeof value.unit === 'string'
                );
            }
            return false;
        })
        .withMessage('Duration must be at least 1 day'),
    validate
];

// Proposal creation validation
const validateProposalCreation = [
    body('jobId')
        .notEmpty()
        .withMessage('Job ID is required')
        .isMongoId()
        .withMessage('Invalid job ID'),
    body('coverLetter')
        .trim()
        .isLength({ min: 50, max: 2000 })
        .withMessage('Cover letter must be between 50 and 2000 characters'),
    body('bidAmount')
        .isFloat({ min: 0 })
        .withMessage('Bid amount must be a positive number'),
    body('deliveryTime')
        .isInt({ min: 1 })
        .withMessage('Delivery time must be at least 1 day'),
    validate
];

// Contract creation validation
const validateContractCreation = [
    body('job')
        .notEmpty()
        .withMessage('Job ID is required')
        .isMongoId()
        .withMessage('Invalid job ID'),
    body('freelancer')
        .notEmpty()
        .withMessage('Freelancer ID is required')
        .isMongoId()
        .withMessage('Invalid freelancer ID'),
    body('agreedAmount')
        .isFloat({ min: 0 })
        .withMessage('Agreed amount must be a positive number'),
    body('budgetType')
        .isIn(['hourly', 'fixed'])
        .withMessage('Budget type must be either hourly or fixed'),
    validate
];

// Review creation validation
const validateReviewCreation = [
    body('contract')
        .notEmpty()
        .withMessage('Contract ID is required')
        .isMongoId()
        .withMessage('Invalid contract ID'),
    body('reviewee')
        .notEmpty()
        .withMessage('Reviewee ID is required')
        .isMongoId()
        .withMessage('Invalid reviewee ID'),
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('comment')
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Comment must be between 10 and 500 characters'),
    validate
];

// Message validation
const validateMessage = [
    body('conversationId')
        .notEmpty()
        .withMessage('Conversation ID is required')
        .isMongoId()
        .withMessage('Invalid conversation ID'),
    body('content')
        .trim()
        .notEmpty()
        .withMessage('Message content is required')
        .isLength({ max: 5000 })
        .withMessage('Message must not exceed 5000 characters'),
    validate
];

// MongoDB ID parameter validation
const validateMongoId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid ID format'),
    validate
];

// Pagination validation
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    validate
];

// Update profile validation
const validateProfileUpdate = [
    body('first_name')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('First name must not exceed 50 characters'),
    body('last_name')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Last name must not exceed 50 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('aboutMe')
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('About me must be between 10 and 2000 characters'),
    body('hourlyRate')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Hourly rate must be a positive number'),
    validate
];

// Hours worked validation
const validateHoursWorked = [
    body('hoursWorked')
        .notEmpty()
        .withMessage('Hours worked is required')
        .isFloat({ min: 0 })
        .withMessage('Hours worked must be a positive number'),
    validate
];

// Admin proposal creation validation (accepts job_id/freelancer_id format)
const validateProposalCreationAdmin = [
    body('job_id')
        .notEmpty()
        .withMessage('Job ID is required')
        .isMongoId()
        .withMessage('Invalid job ID'),
    body('freelancer_id')
        .optional()
        .isMongoId()
        .withMessage('Invalid freelancer ID'),
    body('coverLetter')
        .trim()
        .isLength({ min: 50, max: 2000 })
        .withMessage('Cover letter must be between 50 and 2000 characters'),
    body('bidAmount')
        .isFloat({ min: 0 })
        .withMessage('Bid amount must be a positive number'),
    body('deliveryTime')
        .isInt({ min: 1 })
        .withMessage('Delivery time must be at least 1 day'),
    validate
];

module.exports = {
    validate,
    validateRegistration,
    validateLogin,
    validateChangePassword,
    validateJobCreation,
    validateProposalCreation,
    validateProposalCreationAdmin,
    validateContractCreation,
    validateReviewCreation,
    validateMessage,
    validateMongoId,
    validatePagination,
    validateProfileUpdate,
    validateHoursWorked
};
