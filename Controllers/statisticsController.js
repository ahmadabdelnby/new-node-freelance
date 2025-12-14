const User = require('../Models/User');
const Job = require('../Models/Jobs');
const Proposal = require('../Models/proposals');
const Contract = require('../Models/Contract');
const Payment = require('../Models/Payment');
const Category = require('../Models/Categories');
const Specialty = require('../Models/Specialties');

// Get platform statistics (admin only)
const getPlatformStatistics = async (req, res) => {
    try {
        // Users statistics
        const totalUsers = await User.countDocuments();
        const freelancers = await User.countDocuments({ role: 'user' });
        const admins = await User.countDocuments({ role: 'admin' });
        
        // Recent users (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Jobs statistics
        const totalJobs = await Job.countDocuments();
        const openJobs = await Job.countDocuments({ status: 'open' });
        const inProgressJobs = await Job.countDocuments({ status: 'in_progress' });
        const completedJobs = await Job.countDocuments({ status: 'completed' });
        const cancelledJobs = await Job.countDocuments({ status: 'cancelled' });

        // Proposals statistics
        const totalProposals = await Proposal.countDocuments();
        const submittedProposals = await Proposal.countDocuments({ status: 'submitted' });
        const acceptedProposals = await Proposal.countDocuments({ status: 'accepted' });
        const rejectedProposals = await Proposal.countDocuments({ status: 'rejected' });

        // Contracts statistics
        const totalContracts = await Contract.countDocuments();
        const activeContracts = await Contract.countDocuments({ status: 'active' });
        const completedContracts = await Contract.countDocuments({ status: 'completed' });
        const terminatedContracts = await Contract.countDocuments({ status: 'terminated' });

        // Payments statistics
        const totalPayments = await Payment.countDocuments();
        const completedPayments = await Payment.countDocuments({ status: 'completed' });
        const pendingPayments = await Payment.countDocuments({ status: 'pending' });
        
        // Total revenue
        const revenueData = await Payment.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    totalPlatformFees: { $sum: '$platformFee' }
                }
            }
        ]);

        const revenue = revenueData.length > 0 ? revenueData[0] : {
            totalRevenue: 0,
            totalPlatformFees: 0
        };

        // Most popular categories
        const popularCategories = await Category.aggregate([
            {
                $lookup: {
                    from: 'specialties',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'specialties'
                }
            },
            {
                $lookup: {
                    from: 'jobs',
                    localField: 'specialties._id',
                    foreignField: 'specialty',
                    as: 'jobs'
                }
            },
            {
                $project: {
                    name: 1,
                    jobCount: { $size: '$jobs' }
                }
            },
            { $sort: { jobCount: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({
            users: {
                total: totalUsers,
                freelancers,
                admins,
                newThisMonth: newUsersThisMonth
            },
            jobs: {
                total: totalJobs,
                open: openJobs,
                inProgress: inProgressJobs,
                completed: completedJobs,
                cancelled: cancelledJobs
            },
            proposals: {
                total: totalProposals,
                submitted: submittedProposals,
                accepted: acceptedProposals,
                rejected: rejectedProposals
            },
            contracts: {
                total: totalContracts,
                active: activeContracts,
                completed: completedContracts,
                terminated: terminatedContracts
            },
            payments: {
                total: totalPayments,
                completed: completedPayments,
                pending: pendingPayments
            },
            revenue: {
                total: revenue.totalRevenue,
                platformFees: revenue.totalPlatformFees
            },
            popularCategories
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get growth data (for charts)
const getGrowthData = async (req, res) => {
    try {
        const { period = 'month' } = req.query; // day, week, month, year

        let groupBy;
        let dateRange = new Date();

        switch(period) {
            case 'day':
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                };
                dateRange.setDate(dateRange.getDate() - 30);
                break;
            case 'week':
                groupBy = {
                    year: { $year: '$createdAt' },
                    week: { $week: '$createdAt' }
                };
                dateRange.setDate(dateRange.getDate() - 90);
                break;
            case 'year':
                groupBy = {
                    year: { $year: '$createdAt' }
                };
                dateRange.setFullYear(dateRange.getFullYear() - 5);
                break;
            default: // month
                groupBy = {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                };
                dateRange.setMonth(dateRange.getMonth() - 12);
        }

        // Users growth
        const usersGrowth = await User.aggregate([
            { $match: { createdAt: { $gte: dateRange } } },
            { $group: { _id: groupBy, count: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
        ]);

        // Jobs growth
        const jobsGrowth = await Job.aggregate([
            { $match: { createdAt: { $gte: dateRange } } },
            { $group: { _id: groupBy, count: { $sum: 1 } } },
            { $sort: { '_id': 1 } }
        ]);

        // Revenue growth
        const revenueGrowth = await Payment.aggregate([
            { 
                $match: { 
                    status: 'completed',
                    createdAt: { $gte: dateRange }
                } 
            },
            { 
                $group: { 
                    _id: groupBy, 
                    revenue: { $sum: '$amount' },
                    platformFees: { $sum: '$platformFee' }
                } 
            },
            { $sort: { '_id': 1 } }
        ]);

        res.status(200).json({
            period,
            usersGrowth,
            jobsGrowth,
            revenueGrowth
        });
    } catch (error) {
        console.error('Get growth data error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Get user dashboard statistics
const getUserDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let stats = {};

        // Client statistics
        const myPostedJobs = await Job.countDocuments({ client: userId });
        const myActiveJobs = await Job.countDocuments({ 
            client: userId, 
            status: { $in: ['open', 'in_progress'] }
        });

        const myContracts = await Contract.find({
            $or: [{ client: userId }, { freelancer: userId }]
        }).populate('job', 'title');

        const myActiveContracts = myContracts.filter(c => c.status === 'active');
        const myCompletedContracts = myContracts.filter(c => c.status === 'completed');

        // Freelancer statistics
        const myProposals = await Proposal.countDocuments({ freelancer_id: userId });
        const myAcceptedProposals = await Proposal.countDocuments({ 
            freelancer_id: userId, 
            status: 'accepted' 
        });

        // Payments
        const paymentsReceived = await Payment.aggregate([
            { 
                $match: { 
                    payee: userId,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$netAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const paymentsSent = await Payment.aggregate([
            { 
                $match: { 
                    payer: userId,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const earnings = paymentsReceived.length > 0 ? paymentsReceived[0].total : 0;
        const spent = paymentsSent.length > 0 ? paymentsSent[0].total : 0;

        stats = {
            user: {
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role
            },
            jobs: {
                posted: myPostedJobs,
                active: myActiveJobs
            },
            proposals: {
                submitted: myProposals,
                accepted: myAcceptedProposals
            },
            contracts: {
                total: myContracts.length,
                active: myActiveContracts.length,
                completed: myCompletedContracts.length
            },
            financials: {
                earned: earnings,
                spent: spent,
                balance: earnings - spent
            },
            recentContracts: myContracts.slice(0, 5)
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error('Get user dashboard error:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
};

module.exports = {
    getPlatformStatistics,
    getGrowthData,
    getUserDashboard
};
