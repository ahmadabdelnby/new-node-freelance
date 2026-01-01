const PlatformSettings = require('../Models/PlatformSettings');
const ActivityLog = require('../Models/ActivityLog');

// Get platform settings
const getSettings = async (req, res) => {
    try {
        const settings = await PlatformSettings.getSettings();
        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching platform settings:', error);
        res.status(500).json({ message: 'Error fetching platform settings', error: error.message });
    }
};

// Update platform settings
const updateSettings = async (req, res) => {
    try {
        const settings = await PlatformSettings.getSettings();
        
        const allowedFields = [
            'commissionRate',
            'minProjectBudget',
            'maxProjectBudget',
            'minWithdrawal',
            'maxWithdrawal',
            'maxProposalsPerJob',
            'maxActiveJobsPerClient',
            'maxActiveContractsPerFreelancer',
            'proposalExpirationDays',
            'contractDeadlineExtensionDays',
            'allowNewRegistrations',
            'requireEmailVerification',
            'enableWithdrawals',
            'maintenanceMode'
        ];
        
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }
        
        updates.updatedBy = req.user._id;
        
        Object.assign(settings, updates);
        await settings.save();
        
        // Log the activity
        await ActivityLog.create({
            admin: req.user._id,
            action: 'settings_change',
            entityType: 'platform_settings',
            entityId: settings._id,
            description: `Platform settings updated`,
            details: updates,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.status(200).json({
            message: 'Settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Error updating platform settings:', error);
        res.status(500).json({ message: 'Error updating platform settings', error: error.message });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
