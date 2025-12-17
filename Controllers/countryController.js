const Country = require('../Models/Country');

// Get all countries
const getAllCountries = async (req, res) => {
    try {
        const { search } = req.query;
        let query = { isActive: true };

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const countries = await Country.find(query).sort({ name: 1 });
        res.status(200).json(countries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get country by ID
const getCountryById = async (req, res) => {
    try {
        const { id } = req.params;
        const country = await Country.findById(id);
        if (!country) {
            return res.status(404).json({ message: 'Country not found' });
        }
        res.status(200).json(country);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new country
const createCountry = async (req, res) => {
    try {
        const { name, code, flag } = req.body;
        const newCountry = new Country({ name, code, flag });
        await newCountry.save();
        res.status(201).json(newCountry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update country by ID
const updateCountryById = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedCountry = await Country.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedCountry) {
            return res.status(404).json({ message: 'Country not found' });
        }
        res.status(200).json(updatedCountry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete country by ID
const deleteCountryById = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCountry = await Country.findByIdAndDelete(id);
        if (!deletedCountry) {
            return res.status(404).json({ message: 'Country not found' });
        }
        res.status(200).json({ message: 'Country deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllCountries,
    getCountryById,
    createCountry,
    updateCountryById,
    deleteCountryById
};
