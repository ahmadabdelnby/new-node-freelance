const express = require('express');
const router = express.Router();
const {
    getAllCountries,
    getCountryById,
    createCountry,
    updateCountryById,
    deleteCountryById
} = require('../Controllers/countryController');

// Get all countries (with optional search)
router.get('/', getAllCountries);

// Get country by ID
router.get('/:id', getCountryById);

// Create a new country (admin only - add auth middleware if needed)
router.post('/', createCountry);

// Update country by ID (admin only - add auth middleware if needed)
router.put('/:id', updateCountryById);

// Delete country by ID (admin only - add auth middleware if needed)
router.delete('/:id', deleteCountryById);

module.exports = router;
