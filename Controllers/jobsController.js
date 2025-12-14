const job = require('../Models/Jobs');

// Create a new job
const createJob = async (req, res) => {
    try {
        const { client, title, description, specialty, skills, budget } = req.body;
        const newJob = new job({
            client,
            title,
            description,
            specialty,
            skills,
            budget
        });
        await newJob.save();
        res.status(201).json({ message: 'Job created successfully', job: newJob });
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all jobs with optional filters
const getAllJobs = async (req, res) => {
    try {
        const jobs = await job.find()
            .populate('client', 'first_name last_name email')
            .populate('specialty', 'name')
            .populate('skills', 'name')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Search and filter jobs
const searchJobs = async (req, res) => {
    try {
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

        // Text search using MongoDB text index (faster than regex)
        if (search) {
            query.$text = { $search: search };
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
        if (search) {
            sort.score = { $meta: 'textScore' }; // Sort by relevance first
        }
        sort[sortBy] = order === 'asc' ? 1 : -1;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Execute query with pagination
        const [jobs, total] = await Promise.all([
            job.find(query)
                .select(search ? { score: { $meta: 'textScore' } } : {})
                .populate('client', 'first_name last_name email profile_picture_url')
                .populate('specialty', 'name')
                .populate('skills', 'name')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            job.countDocuments(query)
        ]);

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
        const foundJob = await job.findById(jobId)
            .populate('client', 'first_name last_name email country profile_picture_url')
            .populate('specialty', 'name')
            .populate('skills', 'name');
        if (!foundJob) {
            return res.status(404).json({ message: 'Job not found' });
        }
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
        const updatedData = req.body;
        const updatedJob = await job.findByIdAndUpdate(jobId, updatedData, { new: true });
        if (!updatedJob) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.json({ message: 'Job updated successfully', job: updatedJob });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// Delete job by ID
const deleteJobById = async (req, res) => {
    try {
        const jobId = req.params.id;
        const deletedJob = await job.findByIdAndDelete(jobId);
        if (!deletedJob) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.json({ message: 'Job deleted successfully' });
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

        res.json({
            count: jobs.length,
            jobs
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

module.exports = {
    createJob,
    getAllJobs,
    searchJobs,
    getJobById,
    updateJobById,
    deleteJobById,
    incrementJobViews,
    getJobsByClient,
    getFeaturedJobs,
    closeJob
};
