const express = require('express');
const router = express.Router();
const { addFunds } = require('../Controllers/fundsController');
const authenticate = require('../middleware/authenticationMiddle');

// Add funds to account
router.post('/add', authenticate, addFunds);

module.exports = router;
