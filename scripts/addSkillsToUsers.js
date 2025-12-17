const mongoose = require('mongoose');
const User = require('../Models/User');
const Skill = require('../Models/Skills');
require('dotenv').config();

// Connect to MongoDB using environment variable
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelancing')
    .then(() => {
        console.log('✅ Connected to MongoDB');
        addSkillsToUsers();
    }).catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

async function addSkillsToUsers() {
    try {
        // Get all skills
        const allSkills = await Skill.find();
        console.log(`📚 Found ${allSkills.length} skills in database`);

        if (allSkills.length === 0) {
            console.log('❌ No skills found in database. Please run seedSkills.js first');
            process.exit(0);
        }

        // Get all users without skills
        const users = await User.find();
        console.log(`👥 Found ${users.length} users in database`);

        let updatedCount = 0;

        for (const user of users) {
            // Check if user already has skills
            if (user.skills && user.skills.length > 0) {
                console.log(`✅ User ${user.first_name} ${user.last_name} already has ${user.skills.length} skills`);
                continue;
            }

            // Randomly assign 3-6 skills to each user
            const numSkills = Math.floor(Math.random() * 4) + 3; // 3 to 6 skills
            const randomSkills = [];
            const skillsCopy = [...allSkills];

            for (let i = 0; i < numSkills && skillsCopy.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * skillsCopy.length);
                randomSkills.push(skillsCopy[randomIndex]._id);
                skillsCopy.splice(randomIndex, 1);
            }

            // Update user with skills
            user.skills = randomSkills;
            await user.save();
            updatedCount++;

            console.log(`✅ Added ${randomSkills.length} skills to ${user.first_name} ${user.last_name}`);
        }

        console.log(`\n✅ Successfully updated ${updatedCount} users with skills`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding skills to users:', error);
        process.exit(1);
    }
}
