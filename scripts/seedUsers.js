const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('../Models/User');
const Category = require('../Models/Categories');
const Specialty = require('../Models/Specialties');
const Skill = require('../Models/Skills');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

// Real names for users
const firstNames = {
    male: [
        'Ahmed', 'Mohammed', 'Omar', 'Ali', 'Hassan', 'Mahmoud', 'Khaled', 'Youssef',
        'Amr', 'Tarek', 'Karim', 'Mostafa', 'Ibrahim', 'Adel', 'Sherif', 'Hany',
        'Osama', 'Wael', 'Tamer', 'Eslam', 'Sayed', 'Abdallah', 'Hamza', 'Ziad',
        'John', 'Michael', 'David', 'James', 'Robert', 'William', 'Richard', 'Thomas',
        'Christopher', 'Daniel', 'Matthew', 'Andrew', 'Ryan', 'Brian', 'Kevin', 'Mark'
    ],
    female: [
        'Fatma', 'Mariam', 'Sara', 'Nour', 'Hala', 'Dina', 'Aya', 'Salma',
        'Nada', 'Rana', 'Menna', 'Yasmin', 'Hana', 'Laila', 'Reem', 'Noha',
        'Amira', 'Mai', 'Dalia', 'Eman', 'Heba', 'Nesma', 'Shahd', 'Farida',
        'Sarah', 'Emily', 'Jessica', 'Lisa', 'Jennifer', 'Michelle', 'Amanda', 'Laura',
        'Rebecca', 'Rachel', 'Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte'
    ]
};

const lastNames = [
    'Mohamed', 'Ahmed', 'Ali', 'Hassan', 'Ibrahim', 'Mahmoud', 'Youssef', 'Sayed',
    'Abdel Rahman', 'Mostafa', 'Khaled', 'Sami', 'Fathy', 'Fouad', 'Magdy', 'Nabil',
    'Rashad', 'Salem', 'Taha', 'Zaki', 'Farouk', 'Gaber', 'Hamdy', 'Ismail',
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'White'
];

const countries = [
    'Egypt', 'Saudi Arabia', 'United Arab Emirates', 'Jordan', 'Lebanon', 'Kuwait',
    'United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Australia',
    'Palestine', 'Syria', 'Iraq', 'Morocco', 'Tunisia', 'Algeria'
];

const aboutMeTemplates = [
    "I'm a skilled professional with {years} years of experience in {specialty}. I'm passionate about delivering high-quality work and exceeding client expectations.",
    "Experienced {specialty} specialist with a proven track record of successful projects. I focus on delivering results that matter to my clients.",
    "Professional {specialty} expert dedicated to providing top-notch services. With {years} years in the industry, I bring both expertise and creativity to every project.",
    "Highly motivated {specialty} professional who loves tackling challenging projects. My goal is to help clients achieve their objectives through quality work.",
    "I specialize in {specialty} and have been working in this field for {years} years. I believe in clear communication and delivering work that exceeds expectations.",
    "As a {specialty} professional, I pride myself on attention to detail and timely delivery. Let's work together to bring your vision to life!",
    "Passionate about {specialty} with {years} years of hands-on experience. I'm committed to delivering exceptional results and building long-term client relationships.",
    "Freelance {specialty} expert offering creative solutions and professional service. My experience spans various projects and industries.",
];

// Generate random date between start and end
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate random integer between min and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick random item from array
function randomPick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Generate username from name
function generateUsername(firstName, lastName, index) {
    const base = (firstName + lastName).toLowerCase().replace(/\s+/g, '');
    return `${base}${index}`;
}

// Generate email from username
function generateEmail(username) {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    return `${username}@${randomPick(domains)}`;
}

// Generate phone number
function generatePhoneNumber() {
    return `+${randomInt(1, 999)}${randomInt(1000000000, 9999999999)}`;
}

// Generate birthdate (age between 20-55)
function generateBirthdate() {
    const today = new Date();
    const age = randomInt(20, 55);
    const birthYear = today.getFullYear() - age;
    const birthMonth = randomInt(0, 11);
    const birthDay = randomInt(1, 28);
    return new Date(birthYear, birthMonth, birthDay);
}

async function seedUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all categories, specialties, and skills
        const categories = await Category.find({ isActive: true });
        const specialties = await Specialty.find({ isActive: true });
        
        if (categories.length === 0 || specialties.length === 0) {
            console.log('❌ No categories or specialties found. Please seed them first.');
            process.exit(1);
        }

        console.log(`📊 Found ${categories.length} categories and ${specialties.length} specialties`);

        const startDate = new Date('2023-01-01');
        const endDate = new Date('2025-12-31');
        
        const numberOfUsers = 50; // Number of users to create
        const users = [];

        // Hash password once for all users
        const hashedPassword = await bcrypt.hash('Password123!', 10);

        for (let i = 0; i < numberOfUsers; i++) {
            const gender = Math.random() > 0.5 ? 'male' : 'female';
            const firstName = randomPick(firstNames[gender]);
            const lastName = randomPick(lastNames);
            const username = generateUsername(firstName, lastName, i + 1);
            const email = generateEmail(username);
            
            // Pick random specialty and get its category
            const specialty = randomPick(specialties);
            const category = categories.find(cat => cat._id.equals(specialty.Category));
            
            // Get skills for this specialty (3-5 skills)
            const specialtySkills = await Skill.find({ specialty: specialty._id }).limit(randomInt(3, 5));
            
            const yearsOfExperience = randomInt(1, 10);
            const aboutMe = randomPick(aboutMeTemplates)
                .replace('{years}', yearsOfExperience)
                .replace('{specialty}', specialty.name);
            
            const createdAt = randomDate(startDate, endDate);
            const isVerified = Math.random() > 0.3; // 70% verified
            const completedJobs = randomInt(0, 50);
            const completedJobsAsClient = randomInt(0, 20);
            
            const user = {
                email,
                username,
                password: hashedPassword,
                confirmPassword: hashedPassword,
                first_name: firstName,
                last_name: lastName,
                gender,
                birthdate: generateBirthdate(),
                country: randomPick(countries),
                role: 'user',
                aboutMe,
                category: category._id,
                specialty: specialty._id,
                skills: specialtySkills.map(skill => skill._id),
                phone_number: generatePhoneNumber(),
                isEmailVerified: isVerified,
                isPhoneVerified: isVerified && Math.random() > 0.5,
                isIdentityVerified: isVerified && Math.random() > 0.7,
                hourlyRate: randomInt(10, 100),
                completedJobs,
                completedJobsAsClient,
                totalEarnings: completedJobs * randomInt(50, 500),
                totalSpent: completedJobsAsClient * randomInt(50, 500),
                balance: randomInt(0, 5000),
                averageRating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 to 5.0
                totalReviews: completedJobs > 0 ? randomInt(0, completedJobs) : 0,
                rehireRate: completedJobs > 0 ? randomInt(50, 100) : 0,
                responseTime: randomInt(1, 24),
                isOnline: Math.random() > 0.7,
                lastSeen: randomDate(new Date(createdAt), new Date()),
                createdAt,
                updatedAt: createdAt
            };

            users.push(user);
        }

        // Insert users using insertMany with ordered: false to skip duplicates
        let insertedCount = 0;
        let skippedCount = 0;

        try {
            const result = await User.insertMany(users, { ordered: false });
            insertedCount = result.length;
        } catch (error) {
            if (error.code === 11000) {
                // Some documents failed due to duplicate keys
                insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
                skippedCount = users.length - insertedCount;
            } else {
                throw error;
            }
        }

        console.log(`✅ Users: ${insertedCount} inserted, ${skippedCount} skipped (duplicates)`);
        console.log(`📊 Date range: 2023-01-01 to 2025-12-31`);
        console.log(`👥 Users have real names and are distributed across ${categories.length} categories`);
        console.log('✅ Users seeded successfully!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding users:', error);
        process.exit(1);
    }
}

seedUsers();
