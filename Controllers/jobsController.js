const job = require('../Models/Jobs');
const Proposal = require('../Models/proposals');
const Contract = require('../Models/Contract');
//new imports for the embedding task
const OpenAI = require('openai');
const User = require('../Models/User');
const mongoose = require('mongoose');

// Create a new job with embedding field
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const createJob = async (req, res) => {
    try {
        // Get client ID from authenticated user
        const clientId = req.user.id;
        let { title, description, specialty, skills, budget, duration, deadline } = req.body;

        // 🔥 Handle skills - can be string (from FormData) or array (from JSON)
        if (typeof skills === 'string') {
            try {
                skills = JSON.parse(skills);
            } catch (e) {
                skills = [];
            }
        }

        // 🔥 Handle budget - can be string (from FormData) or object (from JSON)
        if (typeof budget === 'string') {
            try {
                budget = JSON.parse(budget);
            } catch (e) {
                budget = { type: 'fixed', amount: 0 };
            }
        }

        console.log('📝 Creating new job:', {
            clientId,
            title,
            specialty,
            skillsCount: skills?.length,
            budget,
            duration,
            filesUploaded: req.files?.length || 0
        });

        // 🔥 Process uploaded attachments
        const attachments = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                attachments.push({
                    url: `/uploads/attachments/${file.filename}`,
                    fileName: file.originalname,
                    fileType: file.mimetype,
                    fileSize: file.size
                });
            });
            console.log('✅ Processed', attachments.length, 'attachments');
        }

        // Generate embedding for the job title + description
        const textForEmbedding = `${title} ${description}`;
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-large', // consistent embedding model
            input: textForEmbedding
        });

        const embedding = embeddingResponse.data[0].embedding;

        // Create new job with embedding
        const newJob = new job({
            client: clientId,
            title,
            description,
            specialty,
            skills,
            budget,
            duration: duration ? {
                value: duration,
                unit: 'days'
            } : undefined,
            deadline,
            attachments, // 🔥 Add attachments to job
            embedding // save embedding in DB
        });

        await newJob.save();

        // Populate the job data before sending response
        await newJob.populate([
            { path: 'client', select: 'first_name last_name email profile_picture profile_picture_url' },
            { path: 'specialty', select: 'name description' },
            { path: 'skills', select: 'name' }
        ]);

        console.log('✅ Job created successfully:', newJob._id);

        // 🔥 SEND NOTIFICATION - Job Posted
        try {
            const Notification = require('../Models/notification');
            const { getIO } = require('../services/socketService');

            await Notification.create({
                user: clientId,
                type: 'job_posted',
                content: `Your job "${title}" has been posted successfully`,
                linkUrl: `/jobs/${newJob._id}`,
                category: 'job',
                relatedJob: newJob._id
            });

            const io = getIO();
            if (io) {
                // Send specific job_posted event
                io.to(`user:${clientId}`).emit('job_posted', {
                    jobId: newJob._id,
                    jobTitle: title
                });

                // Send generic notification event to refresh list
                io.to(`user:${clientId}`).emit('notification', {
                    type: 'job_posted',
                    jobId: newJob._id,
                    jobTitle: title
                });
            }
            console.log('✅ Job posted notification sent');
        } catch (notifError) {
            console.error('⚠️ Failed to send job posted notification:', notifError.message);
        }

        // 🔥 Check client balance and warn if insufficient
        const client = await User.findById(clientId);
        const budgetAmount = budget?.amount || 0;

        let balanceWarning = null;
        if (client && client.balance < budgetAmount) {
            balanceWarning = {
                currentBalance: client.balance,
                requiredAmount: budgetAmount,
                shortage: budgetAmount - client.balance,
                message: `Your current balance ($${client.balance}) is less than the job budget ($${budgetAmount}). Please add funds to your wallet before hiring a freelancer.`
            };
            console.log('⚠️ Insufficient balance warning:', balanceWarning);
        }

        res.status(201).json({
            message: 'Job created successfully',
            job: newJob,
            balanceWarning
        });
    } catch (error) {
        console.error('❌ Error creating job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

//update already existing jobs in db
const updateJobEmbeddings = async (req, res) => {
    try {
        console.log('🛠️ Updating embeddings for existing jobs...');

        // Fetch all jobs that are missing embeddings or have empty embeddings
        const jobs = await job.find({ $or: [{ embedding: { $exists: false } }, { embedding: [] }] });

        if (!jobs.length) {
            return res.json({ message: 'All jobs already have embeddings.' });
        }

        for (const j of jobs) {
            const textForEmbedding = `${j.title} ${j.description}`;

            // Generate embedding using large model
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-large',
                input: textForEmbedding
            });

            j.embedding = response.data[0].embedding;

            await j.save();

            console.log(`✅ Updated embedding for job: ${j._id}`);
        }

        res.json({ message: `${jobs.length} job embeddings updated successfully.` });
    } catch (error) {
        console.error('❌ Error updating job embeddings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

//get recommended freelancers based on similarity and freelancers rating
// Cosine similarity helper
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
};

const recommendFreelancers = async (req, res) => {
    try {
        const jobId = req.params.jobId;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: 'Invalid job ID' });
        }

        const currentJob = await job.findById(jobId);
        if (!currentJob || !currentJob.embedding) {
            return res.status(404).json({ message: 'Job not found or missing embedding' });
        }

        // Find past jobs that were completed and rated
        const pastJobs = await job.find({
            _id: { $ne: currentJob._id },
            freelancer: { $ne: null },
            'rating.score': { $exists: true },
            embedding: { $exists: true }
        });

        const freelancerScores = {};

        for (const pastJob of pastJobs) {
            const similarity = cosineSimilarity(currentJob.embedding, pastJob.embedding);

            if (similarity < 0.6) continue; // skip jobs that are too dissimilar

            // Normalize rating to 0-1
            const ratingScore = pastJob.rating.score / 5;

            // Weighted final score: 70% similarity, 30% rating
            const finalScore = 0.7 * similarity + 0.3 * ratingScore;

            const freelancerId = pastJob.freelancer.toString();
            freelancerScores[freelancerId] = Math.max(freelancerScores[freelancerId] || 0, finalScore);
        }

        // Get top 5 freelancers
        const topFreelancerIds = Object.entries(freelancerScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id);

        const freelancers = await User.find({ _id: { $in: topFreelancerIds } })
            .select('first_name last_name email profile_picture specialties');

        res.json({ jobId, recommendedFreelancers: freelancers });
    } catch (error) {
        console.error('❌ Error recommending freelancers:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// Create a new job
// const createJob = async (req, res) => {
//     try {
//         // Get client ID from authenticated user
//         const clientId = req.user.id;
//         const { title, description, specialty, skills, budget, duration, deadline } = req.body;

//         console.log('📝 Creating new job:', {
//             clientId,
//             title,
//             specialty,
//             skillsCount: skills?.length,
//             budget,
//             duration
//         });

//         const newJob = new job({
//             client: clientId,
//             title,
//             description,
//             specialty,
//             skills,
//             budget,
//             duration: duration ? {
//                 value: duration,
//                 unit: 'days'
//             } : undefined,
//             deadline
//         });

//         await newJob.save();

//         // Populate the job data before sending response
//         await newJob.populate([
//             { path: 'client', select: 'first_name last_name email profile_picture' },
//             { path: 'specialty', select: 'name description' },
//             { path: 'skills', select: 'name' }
//         ]);

//         console.log('✅ Job created successfully:', newJob._id);
//         res.status(201).json({ message: 'Job created successfully', job: newJob });
//     } catch (error) {
//         console.error('❌ Error creating job:', error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };

// Get all jobs with optional filters
const getAllJobs = async (req, res) => {
    try {
        // 🔥 ONLY SHOW OPEN JOBS - Professional behavior
        // Jobs in_progress, completed, or cancelled should not appear in public job listings
        const jobs = await job.find({ status: 'open' })
            .populate('client', 'first_name last_name email username profile_picture profile_picture_url createdAt')
            .populate('specialty', 'name')
            .populate('skills', 'name')
            .sort({ createdAt: -1, _id: -1 }); // 🔥 Use _id as secondary sort for precise ordering

        // 🔥 Debug: Check for jobs with null clients
        const jobsWithNullClient = jobs.filter(j => !j.client);
        if (jobsWithNullClient.length > 0) {
            console.log(`⚠️ Warning: ${jobsWithNullClient.length} jobs have null/deleted clients`);
            jobsWithNullClient.forEach(j => {
                console.log(`  - Job ${j._id}: client reference missing`);
            });
        }

        console.log(`✅ Retrieved ${jobs.length} open jobs`);
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Search and filter jobs
const searchJobs = async (req, res) => {
    try {
        console.log('🔍 Search request received:', req.query);

        const {
            search,
            category,
            specialty,
            budgetType,
            minBudget,
            maxBudget,
            status = 'open',
            skills,
            experienceLevel,
            sortBy = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 20
        } = req.query;

        let query = { status };

        // Text search - if no search term provided, don't use text search
        if (search && search.trim()) {
            // Use regex for more flexible search (allows partial matches)
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by specialty
        if (specialty) {
            query.specialty = specialty;
        }

        // Filter by budget type
        if (budgetType) {
            query['budget.type'] = budgetType;
        }

        // Filter by budget range
        if (minBudget || maxBudget) {
            query['budget.amount'] = {};
            if (minBudget) query['budget.amount'].$gte = parseFloat(minBudget);
            if (maxBudget) query['budget.amount'].$lte = parseFloat(maxBudget);
        }

        // Filter by skills
        if (skills) {
            const skillsArray = Array.isArray(skills) ? skills : [skills];
            query.skills = { $in: skillsArray };
        }

        // Filter by experience level
        if (experienceLevel) {
            query.experienceLevel = experienceLevel;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = order === 'asc' ? 1 : -1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query with pagination
        const [jobs, total] = await Promise.all([
            job.find(query)
                .populate('client', 'first_name last_name email profile_picture profile_picture_url createdAt')
                .populate('specialty', 'name')
                .populate('skills', 'name')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            job.countDocuments(query)
        ]);

        console.log('✅ Search results:', {
            query,
            totalFound: total,
            returned: jobs.length
        });

        res.status(200).json({
            jobs,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit),
                hasMore: skip + jobs.length < total
            }
        });
    } catch (error) {
        console.error('Error searching jobs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// Get job by ID
const getJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.user?.id; // from authentication middleware

        const foundJob = await job.findById(jobId)
            .populate('client')
            .populate('specialty', 'name')
            .populate('skills', 'name');

        if (!foundJob) {
            return res.status(404).json({ message: 'Job not found' });
        }

        console.log('📊 Job status:', foundJob.status, '| User:', userId);

        // 🔥 PROFESSIONAL: Authorization based on job status
        if (foundJob.status === 'in_progress' || foundJob.status === 'completed') {
            const Contract = require('../Models/Contract');
            const Proposal = require('../Models/proposals');

            // Find the contract for this job - include job details and proposal deliveryTime
            const jobContract = await Contract.findOne({ job: jobId })
                .populate('freelancer')
                .populate('client')
                .populate('proposal', 'bidAmount coverLetter deliveryTime')
                .populate('job', 'title deadline duration');

            // Find the accepted proposal
            const acceptedProposal = await Proposal.findOne({
                job_id: jobId,
                status: 'accepted'
            }).populate('freelancer_id');

            const isClient = foundJob.client._id.toString() === userId;
            const isHiredFreelancer = jobContract?.freelancer?._id.toString() === userId;

            // 🔥 Only client and hired freelancer can view in_progress/completed jobs
            if (!isClient && !isHiredFreelancer) {
                console.log('❌ Unauthorized: User is not client or hired freelancer');

                // Different messages based on job status
                const statusMessages = {
                    'in_progress': {
                        message: 'This job is currently in progress',
                        reason: 'A freelancer has been hired and is working on this project',
                        suggestion: 'Browse other available jobs that match your skills'
                    },
                    'completed': {
                        message: 'This job has been completed',
                        reason: 'The project has been finished and delivered',
                        suggestion: 'Check out similar jobs that are currently open'
                    }
                };

                const statusInfo = statusMessages[foundJob.status] || statusMessages['in_progress'];

                return res.status(403).json({
                    message: statusInfo.message,
                    status: foundJob.status,
                    reason: statusInfo.reason,
                    suggestion: statusInfo.suggestion,
                    available: false,
                    canViewDetails: false
                });
            }

            // ✅ Authorized - Return job with contract and accepted proposal data
            console.log('✅ Authorized access - Returning job with contract data');
            return res.json({
                ...foundJob.toObject(),
                contract: jobContract,
                acceptedProposal: acceptedProposal,
                viewerRole: isClient ? 'client' : 'freelancer'
            });
        }

        // 🔥 For open/closed/cancelled jobs - everyone can view
        console.log('📊 Job client data:', foundJob.client);
        res.json(foundJob);

    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// Update job by ID
const updateJobById = async (req, res) => {
    try {
        const jobId = req.params.id;

        // Check if job exists and user is the owner
        const existingJob = await job.findById(jobId);
        if (!existingJob) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check authorization (allow admin to update any job)
        if (req.user.role !== 'admin' && existingJob.client.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this job' });
        }

        // 🔥 Admin can update any job, regular users follow normal rules
        if (req.user.role !== 'admin') {
            // 🔥 Professional Rule: Cannot edit jobs that are in_progress, completed, or cancelled
            if (['in_progress', 'completed', 'cancelled', 'closed'].includes(existingJob.status)) {
                return res.status(403).json({
                    message: `Cannot edit job with status: ${existingJob.status}`,
                    reason: 'Job is no longer in open state'
                });
            }
        }

        // 🔥 Professional Rule: Check if job has proposals
        const proposalsCount = await Proposal.countDocuments({ job_id: jobId });
        const hasProposals = proposalsCount > 0;

        // Prepare update data
        const updateData = {
            title: req.body.title,
            description: req.body.description
        };

        // 🔥 Professional Rule: If job has proposals, allow limited editing only (unless admin)
        if (hasProposals && req.user.role !== 'admin') {
            console.log(`⚠️ Job has ${proposalsCount} proposals - Limited editing mode`);
            // Only title and description can be updated
            // Budget, skills, specialty, duration CANNOT be changed
            // (Freelancers submitted proposals based on original requirements)
        } else {
            // 🔥 No proposals or admin: Allow full editing
            console.log('✅ Job has no proposals or user is admin - Full editing allowed');
            updateData.specialty = req.body.specialty;
            updateData.budget = {
                type: req.body.budgetType || 'fixed',
                amount: req.body.budget
            };
            updateData.duration = {
                value: req.body.duration,
                unit: 'days'
            };
        }

        // Handle skills array (only if no proposals or admin)
        if (!hasProposals || req.user.role === 'admin') {
            if (req.body['skills[]']) {
                updateData.skills = Array.isArray(req.body['skills[]'])
                    ? req.body['skills[]']
                    : [req.body['skills[]']];
            } else if (req.body.skills) {
                updateData.skills = Array.isArray(req.body.skills)
                    ? req.body.skills
                    : [req.body.skills];
            }
        }

        // Handle file attachments
        let newAttachments = [];
        if (req.files && req.files.length > 0) {
            newAttachments = req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype
            }));

            // Keep existing attachments and add new ones
            updateData.attachments = [...(existingJob.attachments || []), ...newAttachments];
        }

        const updatedJob = await job.findByIdAndUpdate(
            jobId,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('specialty', 'name')
            .populate('skills', 'name')
            .populate('client', 'firstName lastName email');

        // 🔥 NOTIFY PROPOSAL SUBMITTERS if job updated and has proposals
        if (hasProposals && proposalsCount > 0) {
            try {
                const Notification = require('../Models/notification');
                const { getIO } = require('../services/socketService');

                // Get all proposals for this job
                const proposals = await Proposal.find({ job_id: jobId }).select('freelancer_id');

                // Notify each freelancer who submitted a proposal
                for (const proposal of proposals) {
                    await Notification.create({
                        user: proposal.freelancer_id,
                        type: 'job_updated',
                        content: `The job "${updateData.title || existingJob.title}" you submitted a proposal for has been updated`,
                        linkUrl: `/jobs/${jobId}`,
                        category: 'job',
                        relatedJob: jobId,
                        relatedProposal: proposal._id
                    });

                    const io = getIO();
                    if (io) {
                        // Send specific job_updated event
                        io.to(`user:${proposal.freelancer_id}`).emit('job_updated', {
                            jobId: jobId,
                            jobTitle: updateData.title || existingJob.title
                        });

                        // Send generic notification event to refresh list
                        io.to(`user:${proposal.freelancer_id}`).emit('notification', {
                            type: 'job_updated',
                            jobId: jobId,
                            jobTitle: updateData.title || existingJob.title
                        });
                    }
                }
                console.log(`✅ Job update notifications sent to ${proposalsCount} freelancers`);
            } catch (notifError) {
                console.error('⚠️ Failed to send job update notifications:', notifError.message);
            }
        }

        res.json({
            message: 'Job updated successfully',
            job: updatedJob
        });
    } catch (error) {
        console.error('Error updating job:', error);

        // 🔥 Rollback: Delete uploaded files if update fails
        if (req.files && req.files.length > 0) {
            const fs = require('fs');
            req.files.forEach(file => {
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                        console.log('🗑️ Deleted file due to error:', file.filename);
                    }
                } catch (deleteError) {
                    console.error('Error deleting file:', deleteError);
                }
            });
        }

        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// Delete job by ID
const deleteJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const Notification = require('../Models/notification');

        // Check if job exists
        const existingJob = await job.findById(jobId);
        if (!existingJob) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // 🔥 Professional Rule: Check authorization (allow admin to delete any job)
        if (req.user.role !== 'admin' && existingJob.client.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this job' });
        }

        // 🔥 Admin can delete any job, but regular users follow normal rules
        if (req.user.role !== 'admin') {
            // 🔥 Professional Rule: Cannot delete jobs with proposals
            const proposalsCount = await Proposal.countDocuments({ job_id: jobId });
            if (proposalsCount > 0) {
                return res.status(403).json({
                    message: 'Cannot delete job with proposals',
                    reason: `This job has ${proposalsCount} proposal(s). Use close job instead.`,
                    proposalsCount,
                    suggestion: 'Use the close job endpoint to close this job'
                });
            }

            // 🔥 Professional Rule: Cannot delete jobs that are not in open status
            if (existingJob.status !== 'open') {
                return res.status(403).json({
                    message: `Cannot delete job with status: ${existingJob.status}`,
                    reason: 'Only open jobs without proposals can be deleted',
                    currentStatus: existingJob.status
                });
            }
        }

        // ✅ Safe to delete: Admin or (Open job with no proposals)
        const deletedJob = await job.findByIdAndDelete(jobId);

        // 🔥 Delete all notifications related to this job
        const deletedNotifications = await Notification.deleteMany({ relatedJob: jobId });
        console.log(`✅ Job deleted: ${jobId} (no proposals, open status)`);
        console.log(`✅ Deleted ${deletedNotifications.deletedCount} notification(s) related to this job`);
        console.log(`✅ Job deleted: ${jobId} by ${req.user.role}`);

        res.json({
            message: 'Job deleted successfully',
            jobId: deletedJob._id,
            deletedNotifications: deletedNotifications.deletedCount
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Increment job views
const incrementJobViews = async (req, res) => {
    try {
        const jobId = req.params.id;

        const updatedJob = await job.findByIdAndUpdate(
            jobId,
            { $inc: { views: 1 } },
            { new: true }
        ).select('views');

        if (!updatedJob) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json({
            message: 'View count updated',
            views: updatedJob.views
        });
    } catch (error) {
        console.error('Error incrementing views:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get jobs by client
const getJobsByClient = async (req, res) => {
    try {
        const clientId = req.params.clientId || req.user.id;

        const jobs = await job.find({ client: clientId })
            .populate('specialty', 'name')
            .populate('skills', 'name')
            .sort({ createdAt: -1 });

        // For in_progress jobs, also fetch contract details
        const jobsWithContracts = await Promise.all(jobs.map(async (jobDoc) => {
            const jobObj = jobDoc.toObject();

            // Get proposals count for each job
            const proposalsCount = await Proposal.countDocuments({ job_id: jobObj._id });
            jobObj.proposalsCount = proposalsCount;

            if (jobObj.status === 'in_progress' || jobObj.status === 'completed') {
                const contract = await Contract.findOne({ job: jobObj._id })
                    .populate('freelancer', 'first_name last_name email profile_picture profile_picture_url')
                    .populate('client', 'first_name last_name email')
                    .populate('proposal', 'bidAmount deliveryTime');

                if (contract) {
                    jobObj.contract = contract;
                }
            }

            return jobObj;
        }));

        res.json({
            count: jobsWithContracts.length,
            jobs: jobsWithContracts
        });
    } catch (error) {
        console.error('Error fetching client jobs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get featured jobs
const getFeaturedJobs = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const jobs = await job.find({
            featured: true,
            status: 'open'
        })
            .populate('client', 'first_name last_name profile_picture_url')
            .populate('specialty', 'name')
            .populate('skills', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            count: jobs.length,
            jobs
        });
    } catch (error) {
        console.error('Error fetching featured jobs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Close job
const closeJob = async (req, res) => {
    try {
        const jobId = req.params.id;
        const userId = req.user.id;

        const Job = await job.findById(jobId);
        if (!Job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Verify the user is the job owner
        if (Job.client.toString() !== userId) {
            return res.status(403).json({
                message: 'Only the job owner can close this job'
            });
        }

        if (Job.status === 'completed' || Job.status === 'cancelled') {
            return res.status(400).json({
                message: 'Job is already closed'
            });
        }

        Job.status = 'cancelled';
        Job.closedAt = new Date();
        await Job.save();

        res.json({
            message: 'Job closed successfully',
            job: Job
        });
    } catch (error) {
        console.error('Error closing job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 🔥 Professional: Close job (alternative to delete for jobs with proposals)
const closeJobById = async (req, res) => {
    try {
        const jobId = req.params.id;

        // Check if job exists
        const existingJob = await job.findById(jobId);
        if (!existingJob) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Check authorization
        if (existingJob.client.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to close this job' });
        }

        // Professional Rule: Cannot close jobs that are already in progress or completed
        if (['in_progress', 'completed', 'cancelled'].includes(existingJob.status)) {
            return res.status(403).json({
                message: `Cannot close job with status: ${existingJob.status}`,
                reason: 'Job is already beyond open state'
            });
        }

        // Close the job (change status to 'closed')
        const closedJob = await job.findByIdAndUpdate(
            jobId,
            { status: 'closed' },
            { new: true }
        )
            .populate('client', 'first_name last_name email')
            .populate('specialty', 'name')
            .populate('skills', 'name');

        console.log(`✅ Job closed: ${jobId}`);

        // 🔥 NOTIFY PROPOSAL SUBMITTERS that job was closed
        try {
            const Notification = require('../Models/notification');
            const { getIO } = require('../services/socketService');

            // Get all proposals for this job
            const proposals = await Proposal.find({ job_id: jobId }).select('freelancer_id');

            // Notify each freelancer who submitted a proposal
            for (const proposal of proposals) {
                await Notification.create({
                    user: proposal.freelancer_id,
                    type: 'job_closed',
                    content: `The job "${closedJob.title}" has been closed by the client`,
                    linkUrl: `/jobs/${jobId}`,
                    category: 'job',
                    relatedJob: jobId,
                    relatedProposal: proposal._id
                });

                const io = getIO();
                if (io) {
                    // Send specific job_closed event
                    io.to(`user:${proposal.freelancer_id}`).emit('job_closed', {
                        jobId: jobId,
                        jobTitle: closedJob.title
                    });

                    // Send generic notification event to refresh list
                    io.to(`user:${proposal.freelancer_id}`).emit('notification', {
                        type: 'job_closed',
                        jobId: jobId,
                        jobTitle: closedJob.title
                    });
                }
            }
            console.log(`✅ Job closed notifications sent to ${proposals.length} freelancers`);
        } catch (notifError) {
            console.error('⚠️ Failed to send job closed notifications:', notifError.message);
        }

        res.json({
            message: 'Job closed successfully',
            job: closedJob
        });
    } catch (error) {
        console.error('Error closing job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 🔥 Task 1.2: Get Job Contract Details
const getJobContract = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const userId = req.user.id;

        console.log('🔍 [GET CONTRACT] Request received');
        console.log('📋 Job ID:', jobId);
        console.log('👤 User ID:', userId);

        // Find the job
        const foundJob = await job.findById(jobId);
        if (!foundJob) {
            console.log('❌ Job not found:', jobId);
            return res.status(404).json({ message: 'Job not found' });
        }

        console.log('✅ Job found:', foundJob.title);
        console.log('📊 Job status:', foundJob.status);

        // 🔥 Professional: Only show contract for in_progress or completed jobs
        if (foundJob.status !== 'in_progress' && foundJob.status !== 'completed') {
            console.log('⚠️ Job status not eligible for contract:', foundJob.status);
            return res.status(400).json({
                message: 'No active contract for this job',
                jobStatus: foundJob.status
            });
        }

        // Find the contract
        const Contract = require('../Models/Contract');
        console.log('🔍 Searching for contract...');

        const jobContract = await Contract.findOne({ job: jobId })
            .populate('job', 'title description budget duration skills')
            .populate('client', 'first_name last_name email profile_picture profile_picture_url country')
            .populate('freelancer', 'first_name last_name email profile_picture profile_picture_url country skills specialty')
            .populate('proposal', 'bidAmount deliveryTime coverLetter')
            .populate({
                path: 'deliverables.submittedBy',
                select: 'first_name last_name email'
            });

        if (!jobContract) {
            console.log('❌ Contract not found for job:', jobId);
            return res.status(404).json({ message: 'Contract not found for this job' });
        }

        console.log('✅ Contract found:', jobContract._id);

        // 🔥 Authorization: Only client or hired freelancer can view
        const isClient = jobContract.client._id.toString() === userId;
        const isFreelancer = jobContract.freelancer._id.toString() === userId;

        console.log('🔐 Authorization check:');
        console.log('   - Is Client:', isClient);
        console.log('   - Is Freelancer:', isFreelancer);

        if (!isClient && !isFreelancer) {
            console.log('❌ Authorization failed - user not part of contract');
            return res.status(403).json({
                message: 'Not authorized to view this contract',
                reason: 'You are not part of this contract'
            });
        }

        console.log('✅ Contract data retrieved for user:', userId);

        // Return contract with full details
        res.json({
            success: true,
            contract: jobContract,
            viewerRole: isClient ? 'client' : 'freelancer',
            permissions: {
                canSubmitWork: isFreelancer,
                canReviewWork: isClient,
                canTerminate: isClient || isFreelancer,
                canMessage: true
            }
        });

    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all jobs for admin (all statuses)
const getAllJobsForAdmin = async (req, res) => {
    try {
        const jobs = await job.find({})
            .populate('client', 'first_name last_name email username profile_picture profile_picture_url createdAt')
            .populate('specialty', 'name')
            .populate('skills', 'name')
            .sort({ createdAt: -1, _id: -1 });

        console.log(`✅ Admin: Retrieved ${jobs.length} jobs (all statuses)`);
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching all jobs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create job for admin (supports object format for duration)
const createJobForAdmin = async (req, res) => {
    try {
        const clientId = req.user.id;
        const { title, description, specialty, skills, budget, duration, deadline } = req.body;

        console.log('📝 Admin creating new job:', {
            clientId,
            title,
            specialty,
            skillsCount: skills?.length,
            budget,
            duration,
            filesUploaded: req.files?.length || 0
        });

        // 🔥 Process uploaded attachments
        const attachments = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                attachments.push({
                    url: `/uploads/attachments/${file.filename}`,
                    fileName: file.originalname,
                    fileType: file.mimetype,
                    fileSize: file.size
                });
            });
            console.log('✅ Processed', attachments.length, 'attachments');
        }

        const newJob = new job({
            client: clientId,
            title,
            description,
            specialty,
            skills,
            budget,
            duration, // Accept duration as-is (supports {value, unit} format)
            deadline,
            attachments
        });

        await newJob.save();

        // Populate the job data before sending response
        await newJob.populate([
            { path: 'client', select: 'first_name last_name email profile_picture profile_picture_url' },
            { path: 'specialty', select: 'name description' },
            { path: 'skills', select: 'name' }
        ]);

        console.log('✅ Admin: Job created successfully:', newJob._id);

        res.status(201).json({
            message: 'Job created successfully',
            data: newJob
        });
    } catch (error) {
        console.error('❌ Error creating job for admin:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createJob,
    updateJobEmbeddings,
    recommendFreelancers,
    getAllJobs,
    getAllJobsForAdmin,
    createJobForAdmin,
    searchJobs,
    getJobById,
    updateJobById,
    deleteJobById,
    incrementJobViews,
    getJobsByClient,
    getFeaturedJobs,
    closeJob,
    closeJobById,
    getJobContract
};
