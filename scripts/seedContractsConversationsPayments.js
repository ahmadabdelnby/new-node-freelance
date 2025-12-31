const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Contract = require('../Models/Contract');
const { Conversation, Message } = require('../Models/Chat');
const Payment = require('../Models/Payment');
const Job = require('../Models/Jobs');
const Proposal = require('../Models/proposals');
const User = require('../Models/User');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

// Message templates for conversations
const clientMessageTemplates = [
    "Hi! I reviewed your proposal and I'm interested. Can we discuss the details?",
    "Hello! Your profile looks impressive. Can you start right away?",
    "Hi there! I have some questions about your approach to this project.",
    "Great proposal! When would you be available to start?",
    "Hello! Can you provide more details about your experience with similar projects?",
    "Hi! I'd like to know more about your timeline for this project.",
    "Your proposal caught my attention. Let's discuss the requirements.",
    "Hello! Do you have any questions about the project requirements?",
    "Hi! I'm ready to move forward. What's the next step?",
    "Great! Can you share some examples of your previous work?"
];

const freelancerMessageTemplates = [
    "Thank you for reaching out! I'm excited about this project. When can we start?",
    "Hello! Yes, I can start immediately. I have some ideas to share with you.",
    "Hi! I'd be happy to discuss the project details. What specific aspects would you like to know about?",
    "Thank you! I'm available to start right away. Let me know if you need any clarifications.",
    "Hello! I've worked on several similar projects. I can share my portfolio with you.",
    "Hi! I can definitely meet your timeline. The project looks very interesting!",
    "Thank you for considering my proposal! I'm confident I can deliver excellent results.",
    "Hello! I'm ready to get started. Do you have all the necessary materials?",
    "Hi! I have some suggestions that might improve the project outcome. Would you like to hear them?",
    "Great! I'm looking forward to working with you on this project."
];

const projectUpdateMessages = [
    "I've made good progress on the project. Here's an update on what I've completed so far.",
    "Just wanted to let you know that everything is going smoothly. On track to meet the deadline!",
    "I've completed the first phase. Would you like to review it before I proceed?",
    "Quick update: I'm about halfway done. The results are looking great!",
    "I've finished the main work and now working on the final touches.",
    "Project is coming along nicely! I'll send a preview soon.",
    "Almost done! Just need a few more days for final testing.",
    "I've encountered a minor issue but found a solution. Everything is under control.",
];

const clientResponseMessages = [
    "Sounds great! Keep up the good work.",
    "Perfect! Let me know if you need anything from my end.",
    "Excellent progress! Looking forward to seeing the final result.",
    "Thank you for the update! Everything looks good so far.",
    "Great work! Take your time to ensure quality.",
    "Fantastic! Can't wait to see the completed project.",
    "Appreciate the updates! You're doing an amazing job.",
    "Perfect timing! This is exactly what I was hoping for.",
];

// Generate random date
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate random integer
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick random item
function randomPick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Generate transaction ID
function generateTransactionId() {
    return 'TXN' + Date.now() + randomInt(1000, 9999);
}

async function seedContractsConversationsAndPayments() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all accepted proposals
        const acceptedProposals = await Proposal.find({ status: 'accepted' })
            .populate('job_id')
            .populate('freelancer_id');

        if (acceptedProposals.length === 0) {
            console.log('❌ No accepted proposals found.');
            process.exit(1);
        }

        console.log(`📊 Found ${acceptedProposals.length} accepted proposals`);

        const contracts = [];
        const conversations = [];
        const messages = [];
        const payments = [];

        for (const proposal of acceptedProposals) {
            const job = proposal.job_id;
            const freelancer = proposal.freelancer_id;
            const client = job.client;

            // Create Contract
            const startDate = new Date(proposal.respondedAt || proposal.createdAt);
            startDate.setHours(startDate.getHours() + randomInt(1, 24)); // Start 1-24 hours after acceptance

            const agreedDeliveryTime = proposal.deliveryTime;
            const calculatedDeadline = new Date(startDate);
            calculatedDeadline.setDate(calculatedDeadline.getDate() + agreedDeliveryTime);

            let contractStatus;
            let endDate = null;
            let completedAt = null;
            let deliveredAt = null;

            if (job.status === 'completed') {
                contractStatus = 'completed';
                // Delivered 1-5 days before deadline
                deliveredAt = new Date(calculatedDeadline);
                deliveredAt.setDate(deliveredAt.getDate() - randomInt(1, 5));
                // Completed 1-2 days after delivery
                completedAt = new Date(deliveredAt);
                completedAt.setDate(completedAt.getDate() + randomInt(1, 2));
                endDate = completedAt;
            } else if (job.status === 'in_progress') {
                contractStatus = 'active';
            } else if (job.status === 'cancelled') {
                contractStatus = 'terminated';
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + randomInt(1, 10));
            }

            const contract = {
                job: job._id,
                client: client,
                freelancer: freelancer._id,
                proposal: proposal._id,
                agreedAmount: proposal.bidAmount,
                budgetType: job.budget.type,
                agreedDeliveryTime,
                calculatedDeadline,
                status: contractStatus,
                startDate,
                endDate,
                deliveredAt,
                completedAt,
                description: `Contract for: ${job.title}`,
                hoursWorked: contractStatus === 'completed' ? randomInt(10, 100) : randomInt(0, 50),
                createdAt: startDate,
                updatedAt: endDate || startDate
            };

            contracts.push(contract);

            // Create Conversation
            const numMessages = contractStatus === 'completed' ? randomInt(8, 20) : randomInt(4, 12);
            
            const conversation = {
                participants: [client, freelancer._id],
                job: job._id,
                proposal: proposal._id,
                lastMessageAt: startDate,
                messageCount: numMessages, // ⚡ Added messageCount to be saved in DB
                unreadCount: [
                    { user: client, count: 0 },
                    { user: freelancer._id, count: 0 }
                ],
                createdAt: new Date(proposal.createdAt.getTime() + randomInt(3600000, 86400000)), // 1-24 hours after proposal
                updatedAt: startDate
            };

            conversations.push(conversation);

            // Store temporary data for message generation (will NOT be saved to DB)
            conversation.clientFirstMessages = randomInt(2, 4);
            conversation.freelancerMessages = randomInt(2, 4);
            conversation.updateMessages = contractStatus === 'completed' ? randomInt(2, 4) : randomInt(1, 3);
        }

        // Save Contracts
        console.log('💼 Inserting contracts...');
        const savedContracts = await Contract.insertMany(contracts);
        console.log(`✅ Contracts: ${savedContracts.length} inserted`);

        // Save Conversations
        console.log('💬 Inserting conversations...');
        const savedConversations = await Conversation.insertMany(conversations);
        console.log(`✅ Conversations: ${savedConversations.length} inserted`);

        // Create Messages for each conversation
        console.log('📨 Creating messages...');
        for (let i = 0; i < savedConversations.length; i++) {
            const conversation = savedConversations[i];
            const conversationData = conversations[i];
            const proposal = acceptedProposals[i];
            const job = proposal.job_id;
            const client = job.client;
            const freelancer = proposal.freelancer_id;

            const conversationMessages = [];
            let currentDate = new Date(conversation.createdAt);

            // Initial messages (client reaching out)
            for (let j = 0; j < conversationData.clientFirstMessages; j++) {
                currentDate = new Date(currentDate.getTime() + randomInt(300000, 3600000)); // 5min to 1hour apart
                conversationMessages.push({
                    conversation: conversation._id,
                    sender: client,
                    content: randomPick(clientMessageTemplates),
                    isRead: true,
                    readAt: new Date(currentDate.getTime() + randomInt(60000, 1800000)),
                    isDelivered: true,
                    deliveredAt: new Date(currentDate.getTime() + 5000),
                    createdAt: currentDate,
                    updatedAt: currentDate
                });
            }

            // Freelancer responses
            for (let j = 0; j < conversationData.freelancerMessages; j++) {
                currentDate = new Date(currentDate.getTime() + randomInt(600000, 7200000)); // 10min to 2hours apart
                conversationMessages.push({
                    conversation: conversation._id,
                    sender: freelancer._id,
                    content: randomPick(freelancerMessageTemplates),
                    isRead: true,
                    readAt: new Date(currentDate.getTime() + randomInt(60000, 1800000)),
                    isDelivered: true,
                    deliveredAt: new Date(currentDate.getTime() + 5000),
                    createdAt: currentDate,
                    updatedAt: currentDate
                });
            }

            // Project updates (alternating between freelancer and client)
            for (let j = 0; j < conversationData.updateMessages; j++) {
                currentDate = new Date(currentDate.getTime() + randomInt(86400000, 259200000)); // 1-3 days apart
                
                // Freelancer update
                conversationMessages.push({
                    conversation: conversation._id,
                    sender: freelancer._id,
                    content: randomPick(projectUpdateMessages),
                    isRead: true,
                    readAt: new Date(currentDate.getTime() + randomInt(1800000, 7200000)),
                    isDelivered: true,
                    deliveredAt: new Date(currentDate.getTime() + 5000),
                    createdAt: currentDate,
                    updatedAt: currentDate
                });

                // Client response
                currentDate = new Date(currentDate.getTime() + randomInt(3600000, 14400000)); // 1-4 hours later
                conversationMessages.push({
                    conversation: conversation._id,
                    sender: client,
                    content: randomPick(clientResponseMessages),
                    isRead: true,
                    readAt: new Date(currentDate.getTime() + randomInt(60000, 1800000)),
                    isDelivered: true,
                    deliveredAt: new Date(currentDate.getTime() + 5000),
                    createdAt: currentDate,
                    updatedAt: currentDate
                });
            }

            messages.push(...conversationMessages);

            // Update conversation with last message
            if (conversationMessages.length > 0) {
                const lastMsg = conversationMessages[conversationMessages.length - 1];
                conversation.lastMessageAt = lastMsg.createdAt;
                conversation.updatedAt = lastMsg.createdAt;
            }
        }

        // Save all messages
        const savedMessages = await Message.insertMany(messages);
        console.log(`✅ Messages: ${savedMessages.length} inserted`);

        // Update conversations with last message reference
        for (let i = 0; i < savedConversations.length; i++) {
            const conversation = savedConversations[i];
            const conversationMessages = savedMessages.filter(m => m.conversation.equals(conversation._id));
            
            if (conversationMessages.length > 0) {
                const lastMessage = conversationMessages[conversationMessages.length - 1];
                await Conversation.findByIdAndUpdate(conversation._id, {
                    lastMessage: lastMessage._id,
                    lastMessageAt: lastMessage.createdAt
                });
            }
        }

        // Create Payments for completed contracts
        console.log('💰 Creating payments...');
        const completedContracts = savedContracts.filter(c => c.status === 'completed');

        for (const contract of completedContracts) {
            const proposal = acceptedProposals.find(p => p._id.equals(contract.proposal));
            const job = proposal.job_id;

            // Platform fee (10% of contract amount)
            const platformFee = contract.agreedAmount * 0.10;
            const netAmount = contract.agreedAmount - platformFee;

            // Payment from client (escrow)
            const paymentDate = new Date(contract.startDate);
            paymentDate.setHours(paymentDate.getHours() + 1);

            payments.push({
                contract: contract._id,
                payer: contract.client,
                payee: contract.freelancer,
                amount: contract.agreedAmount,
                currency: 'USD',
                paymentMethod: randomPick(['credit_card', 'paypal', 'wallet']),
                status: 'held',
                type: 'escrow',
                transactionId: generateTransactionId(),
                description: `Escrow payment for: ${job.title}`,
                platformFee,
                netAmount,
                totalAmount: contract.agreedAmount,
                isEscrow: true,
                processedAt: paymentDate,
                createdAt: paymentDate,
                updatedAt: paymentDate
            });

            // Release payment to freelancer upon completion
            const releaseDate = new Date(contract.completedAt);
            releaseDate.setHours(releaseDate.getHours() + randomInt(1, 24));

            payments.push({
                contract: contract._id,
                payer: contract.client,
                payee: contract.freelancer,
                amount: netAmount,
                currency: 'USD',
                paymentMethod: 'wallet',
                status: 'completed',
                type: 'payment',
                transactionId: generateTransactionId(),
                description: `Payment released for: ${job.title}`,
                platformFee: 0,
                netAmount,
                totalAmount: netAmount,
                isEscrow: false,
                processedAt: releaseDate,
                completedAt: releaseDate,
                releasedAt: releaseDate,
                createdAt: releaseDate,
                updatedAt: releaseDate
            });
        }

        // Save Payments
        if (payments.length > 0) {
            const savedPayments = await Payment.insertMany(payments);
            console.log(`✅ Payments: ${savedPayments.length} inserted`);
        } else {
            console.log('ℹ️  No payments to create (no completed contracts)');
        }

        // Summary
        console.log('\n📊 Summary:');
        console.log(`   - Contracts: ${savedContracts.length}`);
        console.log(`   - Conversations: ${savedConversations.length}`);
        console.log(`   - Messages: ${savedMessages.length}`);
        console.log(`   - Payments: ${payments.length}`);
        console.log(`\n✅ All data seeded successfully!`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seedContractsConversationsAndPayments();
