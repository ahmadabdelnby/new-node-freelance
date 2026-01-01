/**
 * Seed Script for Testing Freelancer Recommendation Feature
 * 
 * This script creates jobs with similar titles/descriptions to test
 * the embedding-based recommendation system.
 * 
 * It uses the 4 provided users:
 * 1. RehabBakhet (bakhetrehab@gmail.com)
 * 2. Ahmed (ahmadalnajar13@gmail.com)
 * 3. Mohamed_Makram (ma4501146@gmail.com)
 * 4. radwa1 (radwa1@example.com)
 * 
 * Run with: node scripts/seedSimilarJobsForRecommendation.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('../Models/Jobs');
const Proposal = require('../Models/proposals');
const Contract = require('../Models/Contract');
const { Message, Conversation } = require('../Models/Chat');
const Payment = require('../Models/Payment');
const Specialty = require('../Models/Specialties');
const Skill = require('../Models/Skills');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

// The 4 users provided
const USERS = [
    { _id: '69562e1bc5ca1f27866ba533', email: 'bakhetrehab@gmail.com', username: 'RehabBakhet' },
    { _id: '694d397e4a4146338ecec198', email: 'ahmadalnajar13@gmail.com', username: 'Ahmed' },
    { _id: '694d3fceb77350a130c170d9', email: 'ma4501146@gmail.com', username: 'Mohamed_Makram' },
    { _id: '694faba9de10e50fc80f1e6a', email: 'radwa1@example.com', username: 'radwa1' }
];

// Similar job clusters for testing embedding similarity
const JOB_CLUSTERS = {
    // React/Frontend Development Cluster
    reactFrontend: [
        {
            title: 'Build a Modern React Dashboard Application',
            description: 'We need an experienced React developer to build a comprehensive admin dashboard. The dashboard should include data visualization, user management, and real-time updates. Must have experience with React hooks, Redux, and modern CSS frameworks like Tailwind or Material UI. The application should be responsive and work well on all devices.'
        },
        {
            title: 'React.js Frontend Development for E-commerce Platform',
            description: 'Looking for a skilled React developer to create the frontend for our e-commerce platform. The project includes product listing, shopping cart, checkout flow, and user authentication. Experience with React, Redux Toolkit, and responsive design is required. Integration with REST APIs is essential.'
        },
        {
            title: 'Create Interactive React Web Application with Charts',
            description: 'Need a React developer to build an interactive web application featuring various charts and data visualizations. The app should use React with modern state management and include features like filtering, sorting, and exporting data. Experience with chart libraries like Recharts or Chart.js is a plus.'
        },
        {
            title: 'Develop React Single Page Application for Business',
            description: 'We are looking for a React developer to create a single page application for our business operations. The SPA should include form handling, data tables, and integration with backend APIs. Must be proficient in React, React Router, and state management solutions.'
        },
        {
            title: 'React Frontend Developer for Dashboard Project',
            description: 'Seeking a talented React frontend developer to work on our analytics dashboard project. The dashboard requires complex data visualization, real-time updates via WebSocket, and a modern responsive UI. Experience with React, TypeScript, and charting libraries preferred.'
        }
    ],

    // Node.js/Backend Development Cluster
    nodeBackend: [
        {
            title: 'Build RESTful API with Node.js and Express',
            description: 'We need a Node.js developer to build a robust RESTful API for our mobile application. The API should handle user authentication, data CRUD operations, and file uploads. Must have experience with Express.js, MongoDB, and JWT authentication. API documentation with Swagger is required.'
        },
        {
            title: 'Node.js Backend Development for Web Application',
            description: 'Looking for an experienced Node.js developer to create the backend for our web application. The project includes building APIs, database design with MongoDB, and implementing security best practices. Experience with Express.js and Mongoose is essential.'
        },
        {
            title: 'Develop Node.js Server with Express and MongoDB',
            description: 'Need a backend developer to build a Node.js server application using Express framework and MongoDB database. The server should handle authentication, authorization, and complex business logic. Experience with RESTful API design and database optimization required.'
        },
        {
            title: 'Create Node.js API Backend for Mobile App',
            description: 'We are seeking a Node.js developer to create an API backend for our mobile application. The backend should support real-time features, push notifications, and secure data handling. Must be proficient in Node.js, Express, and MongoDB.'
        },
        {
            title: 'Node.js Express API Development Project',
            description: 'Looking for a skilled backend developer to work on our Node.js Express API project. The API needs to handle high traffic, implement caching strategies, and integrate with third-party services. Experience with MongoDB, Redis, and API security is required.'
        }
    ],

    // Mobile App Development Cluster
    mobileDev: [
        {
            title: 'Build Cross-Platform Mobile App with React Native',
            description: 'We need a React Native developer to build a cross-platform mobile application for iOS and Android. The app should include user authentication, push notifications, and offline support. Experience with React Native, Redux, and native module integration is required.'
        },
        {
            title: 'React Native Mobile Application Development',
            description: 'Looking for an experienced React Native developer to create a mobile app for our startup. The app requires smooth animations, camera integration, and real-time messaging. Must be proficient in React Native, JavaScript, and mobile UI/UX best practices.'
        },
        {
            title: 'Develop iOS and Android App using React Native',
            description: 'Need a mobile developer to build an application for both iOS and Android platforms using React Native. The app should feature social login, location services, and in-app purchases. Experience with React Native navigation and state management required.'
        },
        {
            title: 'Create Mobile App with React Native and Firebase',
            description: 'We are looking for a React Native developer to create a mobile application integrated with Firebase. The app needs real-time database sync, authentication, and cloud messaging. Must have experience with React Native and Firebase services.'
        },
        {
            title: 'React Native Developer for E-commerce Mobile App',
            description: 'Seeking a skilled React Native developer to build an e-commerce mobile application. The app should include product catalog, shopping cart, payment integration, and order tracking. Experience with React Native, Redux, and payment gateways required.'
        }
    ],

    // UI/UX Design Cluster
    uiuxDesign: [
        {
            title: 'Design Modern UI/UX for Web Application',
            description: 'We need a talented UI/UX designer to create a modern and intuitive interface for our web application. The design should follow current design trends, be responsive, and include a complete design system. Experience with Figma and prototyping is required.'
        },
        {
            title: 'Create User Interface Design for Mobile App',
            description: 'Looking for a UI/UX designer to design the user interface for our mobile application. The design should be clean, user-friendly, and follow platform guidelines. Experience with mobile UI design, Figma, and creating interactive prototypes required.'
        },
        {
            title: 'UI/UX Design for Dashboard Application',
            description: 'Need a UI/UX designer to create the interface design for our analytics dashboard. The design should present complex data in an easy-to-understand format with clear visual hierarchy. Experience with dashboard design and data visualization is essential.'
        },
        {
            title: 'Design User Experience for E-commerce Platform',
            description: 'We are seeking a UI/UX designer to improve the user experience of our e-commerce platform. The project includes redesigning the product pages, checkout flow, and user account sections. Must have experience with e-commerce UX and conversion optimization.'
        },
        {
            title: 'Mobile App UI/UX Design Project',
            description: 'Looking for an experienced UI/UX designer to work on our mobile app design project. The design should include all screens, micro-interactions, and a comprehensive style guide. Experience with mobile design patterns and Figma required.'
        }
    ],

    // Full Stack Development Cluster
    fullStack: [
        {
            title: 'Full Stack Developer for MERN Stack Project',
            description: 'We need a full stack developer proficient in MERN stack (MongoDB, Express, React, Node.js) to build a complete web application. The project includes both frontend and backend development with database design. Experience with full stack development and deployment required.'
        },
        {
            title: 'Build Complete Web Application with React and Node.js',
            description: 'Looking for a full stack developer to build a complete web application using React for frontend and Node.js for backend. The application should include user authentication, dashboard, and API integration. Must be experienced in both frontend and backend development.'
        },
        {
            title: 'MERN Stack Development for Business Application',
            description: 'Need a MERN stack developer to create a business management application. The application requires user roles, reporting features, and data export capabilities. Experience with MongoDB, Express, React, and Node.js is essential.'
        },
        {
            title: 'Full Stack Web Development Project',
            description: 'We are looking for a full stack web developer to work on our new project. The project involves building both the frontend using React and the backend using Node.js with MongoDB. Must have experience with modern web development practices and deployment.'
        },
        {
            title: 'Develop Full Stack Application with MERN Technologies',
            description: 'Seeking a skilled full stack developer to build an application using MERN technologies. The application needs real-time features, file handling, and third-party integrations. Experience with MongoDB, Express.js, React.js, and Node.js required.'
        }
    ],

    // Python/Data Science Cluster
    pythonData: [
        {
            title: 'Python Developer for Data Analysis Project',
            description: 'We need a Python developer to work on our data analysis project. The project involves cleaning, processing, and analyzing large datasets. Experience with Python, Pandas, NumPy, and data visualization libraries required. Knowledge of statistical analysis is a plus.'
        },
        {
            title: 'Build Machine Learning Model with Python',
            description: 'Looking for a Python developer with machine learning experience to build a predictive model for our business. The project includes data preprocessing, model training, and deployment. Must be proficient in Python, scikit-learn, and TensorFlow or PyTorch.'
        },
        {
            title: 'Python Data Science and Analytics Project',
            description: 'Need a data scientist to work on our analytics project using Python. The project involves building dashboards, creating reports, and implementing machine learning algorithms. Experience with Python, Pandas, and data visualization required.'
        },
        {
            title: 'Develop Python Script for Data Processing',
            description: 'We are seeking a Python developer to create scripts for automated data processing. The scripts should handle data extraction, transformation, and loading (ETL). Must have experience with Python, data manipulation, and working with APIs.'
        },
        {
            title: 'Python Machine Learning Engineer Needed',
            description: 'Looking for a machine learning engineer to develop and deploy ML models using Python. The project includes natural language processing and recommendation systems. Experience with Python, TensorFlow, and NLP libraries is required.'
        }
    ]
};

// Cover letter templates for proposals
const COVER_LETTERS = [
    'I am very interested in your project and believe I have the perfect skills to complete it successfully. With over 5 years of experience in this field, I have completed numerous similar projects with excellent results. I would love to discuss your requirements in detail and share some of my previous work that aligns with your needs.',
    'Your project caught my attention as it perfectly matches my expertise. I have been working in this domain for several years and have delivered high-quality work to many satisfied clients. I am confident I can deliver exactly what you are looking for within your timeline and budget.',
    'I am excited about the opportunity to work on this project. My background includes extensive experience with similar projects, and I am confident I can bring valuable insights and skills to your team. I am committed to delivering quality work and maintaining clear communication throughout the project.',
    'This project aligns perfectly with my professional experience and interests. I have successfully completed many similar projects and have received excellent feedback from my clients. I am ready to start immediately and can guarantee high-quality deliverables within the specified timeframe.',
    'I would love to contribute my skills to your project. With my proven track record in this field and attention to detail, I am confident I can exceed your expectations. I believe in transparent communication and will keep you updated throughout the development process.'
];

async function getRandomSpecialty() {
    const specialties = await Specialty.find({ isActive: true });
    if (specialties.length === 0) {
        throw new Error('No specialties found. Please run seedCategoriesAndSpecialties.js first.');
    }
    return specialties[Math.floor(Math.random() * specialties.length)];
}

async function getRandomSkills(count = 3) {
    const skills = await Skill.find();
    if (skills.length === 0) {
        return [];
    }
    const shuffled = skills.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(s => s._id);
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomBudget() {
    const types = ['fixed', 'hourly'];
    const type = getRandomElement(types);
    const amount = type === 'fixed' 
        ? Math.floor(Math.random() * 4500) + 500 // 500 - 5000
        : Math.floor(Math.random() * 90) + 10; // 10 - 100 per hour
    return { type, amount };
}

function getRandomDuration() {
    const units = ['days', 'weeks', 'months'];
    const unit = getRandomElement(units);
    let value;
    switch (unit) {
        case 'days': value = Math.floor(Math.random() * 14) + 1; break;
        case 'weeks': value = Math.floor(Math.random() * 8) + 1; break;
        case 'months': value = Math.floor(Math.random() * 6) + 1; break;
    }
    return { value, unit };
}

async function seedJobs() {
    console.log('🚀 Starting to seed similar jobs for recommendation testing...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const createdJobs = [];
    const createdProposals = [];
    const createdContracts = [];
    const createdConversations = [];
    const createdPayments = [];

    // Create jobs from each cluster
    for (const [clusterName, jobs] of Object.entries(JOB_CLUSTERS)) {
        console.log(`📦 Creating jobs from cluster: ${clusterName}`);
        
        for (const jobData of jobs) {
            // Rotate through users as clients
            const clientUser = getRandomElement(USERS);
            const specialty = await getRandomSpecialty();
            const skills = await getRandomSkills(Math.floor(Math.random() * 4) + 2);
            const budget = getRandomBudget();
            const duration = getRandomDuration();
            
            // Random deadline between 1-3 months from now
            const deadline = new Date();
            deadline.setMonth(deadline.getMonth() + Math.floor(Math.random() * 3) + 1);

            const job = new Job({
                client: new mongoose.Types.ObjectId(clientUser._id),
                title: jobData.title,
                description: jobData.description,
                specialty: specialty._id,
                skills: skills,
                budget: budget,
                status: getRandomElement(['open', 'open', 'open', 'in_progress', 'completed']),
                deadline: deadline,
                duration: duration,
                views: Math.floor(Math.random() * 100),
                proposalsCount: 0,
                visibility: 'public',
                featured: Math.random() < 0.2
            });

            await job.save();
            createdJobs.push(job);
            console.log(`   ✅ Created job: "${job.title.substring(0, 50)}..."`);

            // Create 1-3 proposals for each job from other users
            const otherUsers = USERS.filter(u => u._id !== clientUser._id);
            const proposalCount = Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < proposalCount; i++) {
                const freelancer = otherUsers[i % otherUsers.length];
                
                try {
                    const proposal = new Proposal({
                        job_id: job._id,
                        freelancer_id: new mongoose.Types.ObjectId(freelancer._id),
                        coverLetter: getRandomElement(COVER_LETTERS),
                        bidAmount: budget.type === 'fixed' 
                            ? Math.floor(budget.amount * (0.8 + Math.random() * 0.4)) 
                            : Math.floor(budget.amount * (0.9 + Math.random() * 0.2)),
                        deliveryTime: Math.floor(Math.random() * 14) + 7,
                        status: getRandomElement(['submitted', 'viewed', 'accepted', 'rejected'])
                    });

                    await proposal.save();
                    createdProposals.push(proposal);
                    
                    // Update job's proposal count
                    await Job.findByIdAndUpdate(job._id, { $inc: { proposalsCount: 1 } });

                    // If proposal is accepted, create contract and conversation
                    if (proposal.status === 'accepted' || job.status === 'in_progress' || job.status === 'completed') {
                        // Create conversation
                        const conversation = new Conversation({
                            participants: [
                                new mongoose.Types.ObjectId(clientUser._id),
                                new mongoose.Types.ObjectId(freelancer._id)
                            ],
                            job: job._id,
                            lastMessage: 'Looking forward to working with you!',
                            lastMessageAt: new Date()
                        });
                        await conversation.save();
                        createdConversations.push(conversation);

                        // Create some messages
                        const messages = [
                            { sender: clientUser._id, content: 'Hi, I reviewed your proposal and I am impressed!' },
                            { sender: freelancer._id, content: 'Thank you! I am excited to work on this project.' },
                            { sender: clientUser._id, content: 'Great! When can you start?' },
                            { sender: freelancer._id, content: 'I can start right away. Let me know the details.' },
                            { sender: clientUser._id, content: 'Perfect! Looking forward to working with you!' }
                        ];

                        for (const msg of messages) {
                            const message = new Message({
                                conversation: conversation._id,
                                sender: new mongoose.Types.ObjectId(msg.sender),
                                content: msg.content,
                                readBy: [new mongoose.Types.ObjectId(msg.sender)]
                            });
                            await message.save();
                        }

                        // Create contract
                        const contractAmount = proposal.bidAmount;
                        const contract = new Contract({
                            job: job._id,
                            client: new mongoose.Types.ObjectId(clientUser._id),
                            freelancer: new mongoose.Types.ObjectId(freelancer._id),
                            proposal: proposal._id,
                            title: job.title,
                            description: job.description,
                            amount: contractAmount,
                            paymentType: budget.type,
                            status: job.status === 'completed' ? 'completed' : 'active',
                            startDate: new Date(),
                            endDate: deadline,
                            milestones: [
                                {
                                    title: 'Project Completion',
                                    description: 'Complete delivery of the project',
                                    amount: contractAmount,
                                    dueDate: deadline,
                                    status: job.status === 'completed' ? 'paid' : 'pending'
                                }
                            ]
                        });
                        await contract.save();
                        createdContracts.push(contract);

                        // Create payment for completed contracts
                        if (job.status === 'completed') {
                            const payment = new Payment({
                                contract: contract._id,
                                payer: new mongoose.Types.ObjectId(clientUser._id),
                                payee: new mongoose.Types.ObjectId(freelancer._id),
                                amount: contractAmount,
                                currency: 'USD',
                                type: 'milestone',
                                status: 'completed',
                                paymentMethod: 'platform_balance',
                                description: `Payment for ${job.title}`,
                                processedAt: new Date()
                            });
                            await payment.save();
                            createdPayments.push(payment);
                        }
                    }
                } catch (err) {
                    // Skip if duplicate proposal
                    if (err.code !== 11000) {
                        console.error(`   ⚠️ Error creating proposal: ${err.message}`);
                    }
                }
            }
        }
        console.log('');
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Jobs created: ${createdJobs.length}`);
    console.log(`   ✅ Proposals created: ${createdProposals.length}`);
    console.log(`   ✅ Contracts created: ${createdContracts.length}`);
    console.log(`   ✅ Conversations created: ${createdConversations.length}`);
    console.log(`   ✅ Payments created: ${createdPayments.length}`);

    console.log('\n🔄 Now you need to run the embedding script to generate embeddings for the new jobs:');
    console.log('   node scripts/addJobEmbeddings.js\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
}

seedJobs().catch(err => {
    console.error('❌ Error seeding jobs:', err);
    process.exit(1);
});
