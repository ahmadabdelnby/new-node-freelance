const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../Models/Categories');
const Specialty = require('../Models/Specialties');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

const categoriesData = [
    {
        name: 'Programming, Web & App Development',
        description: 'Software development, web design, mobile apps, and technical programming services',
        icon: '💻'
    },
    {
        name: 'Design, Video & Motion Graphics',
        description: 'Graphic design, video editing, animation, and creative visual content',
        icon: '🎨'
    },
    {
        name: 'Digital Marketing & Sales',
        description: 'Online marketing, SEO, social media management, and sales strategies',
        icon: '📱'
    },
    {
        name: 'Writing, Translation & Languages',
        description: 'Content writing, translation services, proofreading, and language teaching',
        icon: '✍️'
    },
    {
        name: 'Training & Remote Education',
        description: 'Online teaching, tutoring, and educational content creation',
        icon: '📚'
    },
    {
        name: 'Support, Assistance & Data Entry',
        description: 'Customer support, virtual assistance, and data management services',
        icon: '🤝'
    },
    {
        name: 'Engineering, Architecture & Interior Design',
        description: 'Architectural design, engineering services, and interior decoration',
        icon: '🏗️'
    },
    {
        name: 'Business & Consulting Services',
        description: 'Business consulting, financial advice, and management services',
        icon: '💼'
    }
];

const specialtiesData = {
    'Programming, Web & App Development': [
        { name: 'Programming', description: 'General programming and software development' },
        { name: 'Website Development', description: 'Building and developing websites using various technologies' },
        { name: 'Mobile App Development', description: 'Creating iOS and Android mobile applications' },
        { name: 'Web Design', description: 'Designing website interfaces and user experiences' },
        { name: 'Application Development', description: 'Building custom software applications' },
        { name: 'App Programming', description: 'Programming and coding mobile applications' },
        { name: 'WordPress', description: 'WordPress development and customization' },
        { name: 'PHP', description: 'PHP backend development and scripting' },
        { name: 'JavaScript', description: 'JavaScript programming and frameworks' },
        { name: 'Python', description: 'Python development and scripting' },
        { name: 'Creating Websites', description: 'Building websites from scratch' },
        { name: 'E-commerce Solutions', description: 'Online store development and e-commerce platforms' },
        { name: 'Software Testing', description: 'Quality assurance and software testing services' },
        { name: 'Database Management', description: 'Database design, optimization, and administration' }
    ],
    'Design, Video & Motion Graphics': [
        { name: 'Creative Design', description: 'Innovative and creative design solutions' },
        { name: 'Graphic Design', description: 'Visual design for print and digital media' },
        { name: 'Photoshop', description: 'Photo editing and manipulation using Adobe Photoshop' },
        { name: 'Logo Design', description: 'Creating unique and professional logos' },
        { name: 'Video Production', description: 'Professional video production services' },
        { name: 'Video Editing', description: 'Professional video editing and post-production' },
        { name: 'Motion Graphics', description: 'Animated graphics and visual effects' },
        { name: 'Adobe Illustrator', description: 'Vector graphics and illustration using Adobe Illustrator' },
        { name: 'Illustration', description: 'Digital and traditional illustration services' },
        { name: 'Advertising', description: 'Creating advertising materials and campaigns' },
        { name: 'Photo Editing', description: 'Photo retouching and enhancement' },
        { name: 'UI/UX Design', description: 'User interface and user experience design' },
        { name: '3D Design', description: '3D modeling and rendering services' }
    ],
    'Digital Marketing & Sales': [
        { name: 'Digital Marketing', description: 'Comprehensive online marketing services' },
        { name: 'Marketing Management', description: 'Planning and managing marketing campaigns' },
        { name: 'Online Marketing', description: 'Internet-based marketing strategies' },
        { name: 'Social Media Marketing', description: 'Social media strategy and management' },
        { name: 'Search Engine Marketing', description: 'SEM and paid search advertising' },
        { name: 'SEO', description: 'Search engine optimization services' },
        { name: 'Marketing Strategy', description: 'Comprehensive marketing planning and strategy' },
        { name: 'Facebook Marketing', description: 'Facebook advertising and page management' },
        { name: 'Social Media Management', description: 'Managing social media accounts and engagement' },
        { name: 'Instagram Marketing', description: 'Instagram advertising and growth strategies' },
        { name: 'Content Marketing', description: 'Content strategy and marketing campaigns' },
        { name: 'Email Marketing', description: 'Email campaigns and newsletter management' },
        { name: 'PPC Advertising', description: 'Pay-per-click advertising campaigns' },
        { name: 'Brand Management', description: 'Brand identity and reputation management' }
    ],
    'Writing, Translation & Languages': [
        { name: 'Content Writing', description: 'Article and blog writing services' },
        { name: 'Creative Writing', description: 'Story writing and creative content' },
        { name: 'Content Editing', description: 'Editing and improving written content' },
        { name: 'Proofreading', description: 'Editing and proofreading services' },
        { name: 'Copywriting', description: 'Marketing and advertising copy' },
        { name: 'Content Rewriting', description: 'Rewriting and improving existing content' },
        { name: 'Article Writing', description: 'Writing articles on various topics' },
        { name: 'English Language', description: 'English writing and communication services' },
        { name: 'Arabic Language', description: 'Arabic writing and communication services' },
        { name: 'Web Content Writing', description: 'Writing content specifically for websites' },
        { name: 'SEO Writing', description: 'Writing optimized content for search engines' },
        { name: 'Translation', description: 'Professional translation services' },
        { name: 'Technical Writing', description: 'Technical documentation and manuals' },
        { name: 'Transcription', description: 'Audio and video transcription services' },
        { name: 'Resume Writing', description: 'Professional CV and resume creation' }
    ],
    'Training & Remote Education': [
        { name: 'Remote Training', description: 'Online training and instruction services' },
        { name: 'Private Tutoring', description: 'One-on-one personalized tutoring sessions' },
        { name: 'E-Learning', description: 'Electronic learning and online education' },
        { name: 'Instructional Design', description: 'Designing effective learning experiences' },
        { name: 'English Language Teaching', description: 'Teaching English as a foreign language' },
        { name: 'Textbook Design', description: 'Creating educational textbooks and materials' },
        { name: 'English Grammar Teaching', description: 'Teaching English grammar and rules' },
        { name: 'Machine Learning', description: 'Teaching machine learning concepts and applications' },
        { name: 'Arabic Language Teaching', description: 'Teaching Arabic language skills' },
        { name: 'Educational Content', description: 'Creating educational videos and materials' },
        { name: 'Math & Science Tutoring', description: 'Specialized tutoring in mathematics and sciences' },
        { name: 'Test Preparation', description: 'Exam preparation and coaching' }
    ],
    'Support, Assistance & Data Entry': [
        { name: 'Data Entry', description: 'Accurate data entry and management' },
        { name: 'Customer Service', description: 'Providing excellent customer support' },
        { name: 'Virtual Assistant', description: 'Remote administrative support services' },
        { name: 'CRM Management', description: 'Managing customer relationship management systems' },
        { name: 'Data Processing', description: 'Processing and organizing data efficiently' },
        { name: 'Data Extraction', description: 'Extracting data from various sources' },
        { name: 'Phone Customer Service', description: 'Providing customer support via phone' },
        { name: 'Microsoft Excel', description: 'Excel spreadsheet management and analysis' },
        { name: 'Product Adding', description: 'Adding products to e-commerce platforms' },
        { name: 'Online Research', description: 'Internet research and information gathering' },
        { name: 'Email Management', description: 'Email organization and response handling' },
        { name: 'Task Coordination', description: 'Coordinating tasks and administrative work' }
    ],
    'Engineering, Architecture & Interior Design': [
        { name: 'Architectural Engineering', description: 'Architectural engineering and design services' },
        { name: 'Architectural Design', description: 'Building and architectural design services' },
        { name: 'Architectural Planning', description: 'Planning and designing architectural projects' },
        { name: 'Architectural Construction', description: 'Construction planning and management' },
        { name: '3D Architectural Design', description: '3D modeling and rendering for architecture' },
        { name: 'AutoCAD', description: 'Technical drawing using AutoCAD' },
        { name: 'Design Creativity', description: 'Creative design solutions for architecture' },
        { name: 'Interior Design', description: 'Interior space planning and decoration' },
        { name: 'Engineering', description: 'General engineering services and consulting' },
        { name: 'Architectural Visualization', description: 'Creating realistic architectural visualizations' },
        { name: 'Civil Engineering', description: 'Civil engineering consulting and design' },
        { name: 'Structural Engineering', description: 'Structural analysis and design' }
    ],
    'Business & Consulting Services': [
        { name: 'Project Management', description: 'Managing business projects and operations' },
        { name: 'Financial Management', description: 'Financial planning and management services' },
        { name: 'Financial Accounting', description: 'Financial accounting and bookkeeping' },
        { name: 'Accounting', description: 'Bookkeeping and accounting services' },
        { name: 'Cost Accounting', description: 'Cost analysis and accounting' },
        { name: 'Financial Analysis', description: 'Analyzing financial data and reports' },
        { name: 'Business Analysis', description: 'Analyzing business processes and requirements' },
        { name: 'Startup Consulting', description: 'Guidance for new businesses and startups' },
        { name: 'Business Plan Writing', description: 'Creating comprehensive business plans' },
        { name: 'Business Management', description: 'Managing business operations and strategy' },
        { name: 'Business Consulting', description: 'Strategic business advice and planning' },
        { name: 'HR Consulting', description: 'Human resources consulting and recruitment' },
        { name: 'Market Analysis', description: 'Market research and competitive analysis' }
    ]
};

async function seedCategoriesAndSpecialties() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        let categoriesInserted = 0;
        let categoriesUpdated = 0;
        let specialtiesInserted = 0;
        let specialtiesUpdated = 0;

        // Insert or update categories
        for (const categoryData of categoriesData) {
            const result = await Category.findOneAndUpdate(
                { name: categoryData.name },
                { $set: categoryData },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            if (result) {
                // Check if it was newly inserted or updated
                const exists = await Category.findOne({ name: categoryData.name });
                if (exists.createdAt.getTime() === exists.updatedAt.getTime()) {
                    categoriesInserted++;
                } else {
                    categoriesUpdated++;
                }
            }
        }

        console.log(`✅ Categories: ${categoriesInserted} inserted, ${categoriesUpdated} updated`);

        // Insert or update specialties
        for (const [categoryName, specialties] of Object.entries(specialtiesData)) {
            const category = await Category.findOne({ name: categoryName });
            
            if (!category) {
                console.log(`⚠️  Category "${categoryName}" not found, skipping specialties`);
                continue;
            }

            for (const specialtyData of specialties) {
                const result = await Specialty.findOneAndUpdate(
                    { name: specialtyData.name },
                    { 
                        $set: {
                            ...specialtyData,
                            Category: category._id
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                if (result) {
                    const exists = await Specialty.findOne({ name: specialtyData.name });
                    if (exists.createdAt.getTime() === exists.updatedAt.getTime()) {
                        specialtiesInserted++;
                    } else {
                        specialtiesUpdated++;
                    }
                }
            }
        }

        console.log(`✅ Specialties: ${specialtiesInserted} inserted, ${specialtiesUpdated} updated`);
        console.log('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedCategoriesAndSpecialties();
