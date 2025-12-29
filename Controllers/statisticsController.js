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

        // Use totalEarnings from user model, or calculate from completed payments
        const earnings = user.totalEarnings || (paymentsReceived.length > 0 ? paymentsReceived[0].total : 0);
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
                balance: user.balance || 0  // Get actual balance from user model
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

// Get chart data for dashboard with dynamic date ranges
const getChartData = async (req, res) => {
    try {
        const { range = '6months', startDate, endDate } = req.query;
        console.log('📊 Chart data request received with params:', { range, startDate, endDate });
        const currentDate = new Date();
        
        // Calculate date range based on selection
        let periodMonths = 6; // default
        let dateArray = [];
        let isCustomRange = false;
        
        if (range === 'custom' && startDate && endDate) {
            isCustomRange = true;
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            // Generate months between start and end date
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const current = new Date(start.getFullYear(), start.getMonth(), 1);
            
            while (current <= end) {
                dateArray.push({
                    month: monthNames[current.getMonth()],
                    year: current.getFullYear(),
                    monthNum: current.getMonth() + 1
                });
                current.setMonth(current.getMonth() + 1);
            }
        } else {
            // Determine period based on range
            switch(range) {
                case '7days':
                    periodMonths = 0;
                    // Generate last 7 days
                    for (let i = 6; i >= 0; i--) {
                        const date = new Date(currentDate);
                        date.setDate(date.getDate() - i);
                        dateArray.push({
                            month: `${date.getMonth() + 1}/${date.getDate()}`,
                            year: date.getFullYear(),
                            monthNum: date.getMonth() + 1,
                            day: date.getDate()
                        });
                    }
                    break;
                case '30days':
                    periodMonths = 1;
                    break;
                case '3months':
                    periodMonths = 3;
                    break;
                case 'year':
                    periodMonths = 12;
                    break;
                case '6months':
                default:
                    periodMonths = 6;
                    break;
            }
            
            // Generate months array for non-custom ranges (except 7days)
            if (periodMonths > 0) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                for (let i = periodMonths - 1; i >= 0; i--) {
                    const date = new Date(currentDate);
                    date.setMonth(date.getMonth() - i);
                    dateArray.push({
                        month: monthNames[date.getMonth()],
                        year: date.getFullYear(),
                        monthNum: date.getMonth() + 1
                    });
                }
            }
        }

        console.log('📅 Generated dateArray:', dateArray.length, 'periods');
        console.log('📅 Labels:', dateArray.map(d => d.month));

        // Users growth data
        const usersGrowthData = await Promise.all(
            dateArray.map(async (period) => {
                let endDate;
                
                if (period.day) {
                    // For daily data
                    endDate = new Date(period.year, period.monthNum - 1, period.day, 23, 59, 59);
                } else {
                    // For monthly data
                    endDate = new Date(period.year, period.monthNum, 0, 23, 59, 59);
                }
                
                const count = await User.countDocuments({
                    createdAt: { $lte: endDate }
                });
                
                return count;
            })
        );

        // Revenue growth data
        const revenueGrowthData = await Promise.all(
            dateArray.map(async (period) => {
                let startDate, endDate;
                
                if (period.day) {
                    // For daily data
                    startDate = new Date(period.year, period.monthNum - 1, period.day, 0, 0, 0);
                    endDate = new Date(period.year, period.monthNum - 1, period.day, 23, 59, 59);
                } else {
                    // For monthly data
                    startDate = new Date(period.year, period.monthNum - 1, 1);
                    endDate = new Date(period.year, period.monthNum, 0, 23, 59, 59);
                }
                
                const result = await Payment.aggregate([
                    {
                        $match: {
                            status: 'completed',
                            createdAt: { $gte: startDate, $lte: endDate }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]);
                
                return result.length > 0 ? Math.round(result[0].total) : 0;
            })
        );

        // Jobs by status - Get all statuses
        const openJobs = await Job.countDocuments({ status: 'open' });
        const inProgressJobs = await Job.countDocuments({ status: 'in_progress' });
        const completedJobs = await Job.countDocuments({ status: 'completed' });
        const cancelledJobs = await Job.countDocuments({ status: 'cancelled' });

        // If no data exists, provide sample data for visualization
        const hasData = usersGrowthData.some(val => val > 0) || 
                       revenueGrowthData.some(val => val > 0) || 
                       (openJobs + inProgressJobs + completedJobs + cancelledJobs) > 0;

        if (!hasData) {
            // Return sample data for empty database
            return res.status(200).json({
                userGrowth: {
                    labels: dateArray.map(m => m.month),
                    data: range === '7days' 
                        ? [2, 3, 5, 7, 9, 10, 12]
                        : [5, 12, 18, 25, 32, 40] // Sample progression
                },
                revenueGrowth: {
                    labels: dateArray.map(m => m.month),
                    data: range === '7days'
                        ? [150, 230, 310, 420, 580, 650, 750]
                        : [1500, 2300, 3100, 4200, 5800, 7500] // Sample progression
                },
                jobsStatus: {
                    labels: ['Open', 'In Progress', 'Completed', 'Cancelled'],
                    data: [8, 5, 12, 3] // Sample data
                },
                isSampleData: true // Flag to indicate this is sample data
            });
        }

        res.status(200).json({
            userGrowth: {
                labels: dateArray.map(m => m.month),
                data: usersGrowthData
            },
            revenueGrowth: {
                labels: dateArray.map(m => m.month),
                data: revenueGrowthData
            },
            jobsStatus: {
                labels: ['Open', 'In Progress', 'Completed', 'Cancelled'],
                data: [openJobs, inProgressJobs, completedJobs, cancelledJobs]
            },
            isSampleData: false
        });
    } catch (error) {
        console.error('Get chart data error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    getPlatformStatistics,
    getGrowthData,
    getUserDashboard,
    getChartData
};
