const mongoose = require('mongoose');
require('dotenv').config();

const Specialties = require('../Models/Specialties');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const specs = await Specialties.find().select('name');
    
    console.log('📊 Available Specialties:');
    console.log('========================');
    specs.forEach((spec, index) => {
        console.log(`${index + 1}. ${spec.name} (ID: ${spec._id})`);
    });
    console.log(`\nTotal: ${specs.length} specialties\n`);
    
    process.exit();
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
