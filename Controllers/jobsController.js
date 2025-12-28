const job = require('../Models/Jobs');
//new imports for the embedding task
const OpenAI = require('openai');
const User = require('../models/user');
const mongoose = require('mongoose');

// Create a new job with embedding field
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const createJob = async (req, res) => {
  try {
    // Get client ID from authenticated user
    const clientId = req.user.id;
    const { title, description, specialty, skills, budget, duration, deadline } = req.body;

    console.log('📝 Creating new job:', {
      clientId,
      title,
      specialty,
      skillsCount: skills?.length,
      budget,
      duration
    });

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
      duration: duration ? { value: duration, unit: 'days' } : undefined,
      deadline,
      embedding // save embedding in DB
    });

    await newJob.save();

    // Populate related fields
    await newJob.populate([
      { path: 'client', select: 'first_name last_name email profile_picture' },
      { path: 'specialty', select: 'name description' },
      { path: 'skills', select: 'name' }
    ]);

    console.log('✅ Job created successfully:', newJob._id);
    res.status(201).json({ message: 'Job created successfully', job: newJob });
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
                .populate('client', 'first_name last_name email profile_picture_url')
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
    updateJobEmbeddings,
    recommendFreelancers,
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
