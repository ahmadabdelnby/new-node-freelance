const ActivityLog = require('../Models/ActivityLog');

// Get all activity logs with pagination and filters
const getAllLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const query = {};
        
        // Filter by action type
        if (req.query.action) {
            query.action = req.query.action;
        }
        
        // Filter by entity type
        if (req.query.entityType) {
            query.entityType = req.query.entityType;
        }
        
        // Filter by admin
        if (req.query.admin) {
            query.admin = req.query.admin;
        }
        
        // Filter by date range
        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};
            if (req.query.startDate) {
                query.createdAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                query.createdAt.$lte = new Date(req.query.endDate);
            }
        }
        
        const [logs, total] = await Promise.all([
            ActivityLog.find(query)
                .populate('admin', 'username email first_name last_name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ActivityLog.countDocuments(query)
        ]);
        
        res.status(200).json({
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ message: 'Error fetching activity logs', error: error.message });
    }
};

// Get activity log by ID
const getLogById = async (req, res) => {
    try {
        const log = await ActivityLog.findById(req.params.id)
            .populate('admin', 'username email first_name last_name');
        
        if (!log) {
            return res.status(404).json({ message: 'Activity log not found' });
        }
        
        res.status(200).json(log);
    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ message: 'Error fetching activity log', error: error.message });
    }
};

// Get activity statistics
const getLogStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thisWeek = new Date(today);
        thisWeek.setDate(thisWeek.getDate() - 7);
        
        const [
            total,
            todayCount,
            weekCount,
            byAction,
            byEntityType
        ] = await Promise.all([
            ActivityLog.countDocuments(),
            ActivityLog.countDocuments({ createdAt: { $gte: today } }),
            ActivityLog.countDocuments({ createdAt: { $gte: thisWeek } }),
            ActivityLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            ActivityLog.aggregate([
                { $group: { _id: '$entityType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);
        
        res.status(200).json({
            total,
            todayCount,
            weekCount,
            byAction: byAction.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byEntityType: byEntityType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('Error fetching activity stats:', error);
        res.status(500).json({ message: 'Error fetching activity stats', error: error.message });
    }
};

// Create activity log (utility function for other controllers)
const createLog = async (adminId, action, entityType, entityId, description, details = null, req = null) => {
    try {
        const logData = {
            admin: adminId,
            action,
            entityType,
            entityId,
            description,
            details
        };
        
        if (req) {
            logData.ipAddress = req.ip;
            logData.userAgent = req.get('User-Agent');
        }
        
        return await ActivityLog.create(logData);
    } catch (error) {
        console.error('Error creating activity log:', error);
        return null;
    }
};

module.exports = {
    getAllLogs,
    getLogById,
    getLogStats,
    createLog
};
