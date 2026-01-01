const ContractModificationRequest = require('../Models/ContractModificationRequest');
const Contract = require('../Models/Contract');
const Job = require('../Models/Jobs');
const User = require('../Models/User');
const Payment = require('../Models/Payment');
const Notification = require('../Models/notification');
const { getIO, emitToUser } = require('../services/socketService');
const { sendEmail, emailTemplates } = require('../services/emailService');

/**
 * Create a new modification request (Freelancer only)
 */
const createModificationRequest = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { contractId, modificationType, requestedBudget, requestedDeliveryTime, reason } = req.body;

        // Validate required fields
        if (!contractId || !modificationType || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Contract ID, modification type, and reason are required'
            });
        }

        // Get contract with populated data
        const contract = await Contract.findById(contractId)
            .populate('job')
            .populate('client', 'first_name last_name email')
            .populate('freelancer', 'first_name last_name email');

        if (!contract) {
            return res.status(404).json({
                success: false,
                message: 'Contract not found'
            });
        }

        // Only freelancer can request modifications
        if (String(contract.freelancer._id) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Only the freelancer can request contract modifications'
            });
        }

        // Contract must be active
        if (contract.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Can only request modifications for active contracts'
            });
        }

        // Check for pending modification requests
        const pendingRequest = await ContractModificationRequest.findOne({
            contract: contractId,
            status: 'pending'
        });

        if (pendingRequest) {
            return res.status(400).json({
                success: false,
                message: 'There is already a pending modification request for this contract'
            });
        }

        // Validate modification type and values
        if (modificationType === 'budget' || modificationType === 'both') {
            if (!requestedBudget || requestedBudget <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid requested budget is required'
                });
            }
        }

        if (modificationType === 'deadline' || modificationType === 'both') {
            if (!requestedDeliveryTime || requestedDeliveryTime < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid requested delivery time (in days) is required'
                });
            }
        }

        // Calculate budget difference
        let budgetDifference = 0;
        if (requestedBudget) {
            budgetDifference = requestedBudget - contract.agreedAmount;
        }

        // Calculate new deadline
        let newDeadline = null;
        if (requestedDeliveryTime) {
            newDeadline = new Date(contract.startDate);
            newDeadline.setDate(newDeadline.getDate() + requestedDeliveryTime);
        }

        // Create modification request
        const modificationRequest = await ContractModificationRequest.create({
            contract: contractId,
            job: contract.job._id,
            requestedBy: userId,
            requestedTo: contract.client._id,
            modificationType,
            currentValues: {
                budget: contract.agreedAmount,
                deadline: contract.calculatedDeadline,
                deliveryTime: contract.agreedDeliveryTime
            },
            requestedValues: {
                budget: requestedBudget || contract.agreedAmount,
                deadline: newDeadline || contract.calculatedDeadline,
                deliveryTime: requestedDeliveryTime || contract.agreedDeliveryTime
            },
            reason,
            budgetDifference
        });

        // Populate the request
        await modificationRequest.populate([
            { path: 'requestedBy', select: 'first_name last_name email profile_picture' },
            { path: 'requestedTo', select: 'first_name last_name email' },
            { path: 'contract', select: 'agreedAmount agreedDeliveryTime status' },
            { path: 'job', select: 'title' }
        ]);

        // Create notification for client
        const notificationContent = `${contract.freelancer.first_name} ${contract.freelancer.last_name} has requested a contract modification for "${contract.job.title}"`;

        await Notification.create({
            user: contract.client._id,
            type: 'contract_updated',
            content: notificationContent,
            linkUrl: `/contracts/${contractId}/modification-requests`,
            category: 'contract',
            relatedContract: contractId,
            priority: 'high'
        });

        // Send Socket.IO notification
        try {
            const io = getIO();
            io.to(`user:${contract.client._id}`).emit('notification', {
                type: 'contract_modification_requested',
                content: notificationContent,
                contractId,
                modificationRequestId: modificationRequest._id
            });
            io.to(`user:${contract.client._id}`).emit('contract_modification_requested', {
                modificationRequest,
                contractId
            });
        } catch (socketError) {
            console.error('Socket notification error:', socketError.message);
        }

        // Send email to client
        try {
            if (contract.client.email) {
                const template = emailTemplates.contractModificationRequested(
                    contract.client.first_name,
                    contract.freelancer.first_name + ' ' + contract.freelancer.last_name,
                    contract.job.title,
                    modificationType,
                    modificationRequest.currentValues,
                    modificationRequest.requestedValues,
                    reason,
                    contractId
                );
                await sendEmail({
                    to: contract.client.email,
                    subject: template.subject,
                    html: template.html
                });
            }
        } catch (emailError) {
            console.error('Email send error:', emailError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Modification request submitted successfully',
            data: modificationRequest
        });

    } catch (error) {
        console.error('Create modification request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * Respond to modification request (Client only - approve or reject)
 */
const respondToModificationRequest = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { requestId } = req.params;
        const { action, responseNote } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be either "approve" or "reject"'
            });
        }

        // Get modification request
        const modificationRequest = await ContractModificationRequest.findById(requestId)
            .populate('contract')
            .populate('job', 'title')
            .populate('requestedBy', 'first_name last_name email')
            .populate('requestedTo', 'first_name last_name email');

        if (!modificationRequest) {
            return res.status(404).json({
                success: false,
                message: 'Modification request not found'
            });
        }

        // Only client (requestedTo) can respond
        if (String(modificationRequest.requestedTo._id) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Only the client can respond to this request'
            });
        }

        // Request must be pending
        if (modificationRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'This request has already been processed'
            });
        }

        const contract = await Contract.findById(modificationRequest.contract._id);
        const client = await User.findById(userId);
        const freelancer = modificationRequest.requestedBy;

        if (action === 'approve') {
            // Handle budget modification
            if (modificationRequest.modificationType === 'budget' || modificationRequest.modificationType === 'both') {
                const budgetDiff = modificationRequest.budgetDifference;

                if (budgetDiff > 0) {
                    // Budget increase - client needs to pay the difference
                    if (client.balance < budgetDiff) {
                        return res.status(400).json({
                            success: false,
                            message: `Insufficient balance. You need $${budgetDiff.toFixed(2)} more to approve this modification. Please add funds.`,
                            requiredAmount: budgetDiff,
                            currentBalance: client.balance
                        });
                    }

                    // Deduct from client balance
                    await User.updateOne(
                        { _id: userId },
                        { $inc: { balance: -budgetDiff } }
                    );

                    // Update escrow payment
                    const escrowPayment = await Payment.findOne({
                        contract: contract._id,
                        status: 'held',
                        isEscrow: true
                    });

                    if (escrowPayment) {
                        escrowPayment.amount += budgetDiff;
                        escrowPayment.platformFee = escrowPayment.amount * 0.10;
                        escrowPayment.netAmount = escrowPayment.amount - escrowPayment.platformFee;
                        await escrowPayment.save();
                    }

                    console.log(`✅ Client paid $${budgetDiff} for budget increase`);

                } else if (budgetDiff < 0) {
                    // Budget decrease - refund the difference to client
                    const refundAmount = Math.abs(budgetDiff);

                    // Add to client balance
                    await User.updateOne(
                        { _id: userId },
                        { $inc: { balance: refundAmount } }
                    );

                    // Update escrow payment
                    const escrowPayment = await Payment.findOne({
                        contract: contract._id,
                        status: 'held',
                        isEscrow: true
                    });

                    if (escrowPayment) {
                        escrowPayment.amount -= refundAmount;
                        escrowPayment.platformFee = escrowPayment.amount * 0.10;
                        escrowPayment.netAmount = escrowPayment.amount - escrowPayment.platformFee;
                        await escrowPayment.save();
                    }

                    console.log(`✅ Refunded $${refundAmount} to client for budget decrease`);
                }

                // Update contract budget
                contract.agreedAmount = modificationRequest.requestedValues.budget;
            }

            // Handle deadline modification
            if (modificationRequest.modificationType === 'deadline' || modificationRequest.modificationType === 'both') {
                contract.agreedDeliveryTime = modificationRequest.requestedValues.deliveryTime;
                contract.calculatedDeadline = modificationRequest.requestedValues.deadline;
            }

            await contract.save();

            // Update job if needed (optional - depends on requirements)
            if (modificationRequest.modificationType === 'budget' || modificationRequest.modificationType === 'both') {
                await Job.findByIdAndUpdate(modificationRequest.job._id, {
                    'budget.amount': modificationRequest.requestedValues.budget
                });
            }

            modificationRequest.status = 'approved';
        } else {
            modificationRequest.status = 'rejected';
        }

        modificationRequest.responseNote = responseNote || '';
        modificationRequest.respondedAt = new Date();
        await modificationRequest.save();

        // Create notification for freelancer
        const actionText = action === 'approve' ? 'approved' : 'rejected';
        const notificationContent = `Your contract modification request for "${modificationRequest.job.title}" has been ${actionText}`;

        await Notification.create({
            user: freelancer._id,
            type: action === 'approve' ? 'contract_updated' : 'contract_disputed',
            content: notificationContent,
            linkUrl: `/contracts/${contract._id}`,
            category: 'contract',
            relatedContract: contract._id,
            priority: 'high'
        });

        // Send Socket.IO notification
        try {
            const io = getIO();
            io.to(`user:${freelancer._id}`).emit('notification', {
                type: `contract_modification_${actionText}`,
                content: notificationContent,
                contractId: contract._id,
                modificationRequestId: modificationRequest._id
            });
            io.to(`user:${freelancer._id}`).emit(`contract_modification_${actionText}`, {
                modificationRequest,
                contractId: contract._id
            });
        } catch (socketError) {
            console.error('Socket notification error:', socketError.message);
        }

        // Send email to freelancer
        try {
            if (freelancer.email) {
                const template = emailTemplates.contractModificationResponse(
                    freelancer.first_name,
                    modificationRequest.job.title,
                    action,
                    responseNote,
                    contract._id
                );
                await sendEmail({
                    to: freelancer.email,
                    subject: template.subject,
                    html: template.html
                });
            }
        } catch (emailError) {
            console.error('Email send error:', emailError.message);
        }

        res.status(200).json({
            success: true,
            message: `Modification request ${actionText} successfully`,
            data: modificationRequest
        });

    } catch (error) {
        console.error('Respond to modification request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * Get modification requests for a contract
 */
const getModificationRequestsByContract = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { contractId } = req.params;

        // Verify user is part of the contract
        const contract = await Contract.findById(contractId);
        if (!contract) {
            return res.status(404).json({
                success: false,
                message: 'Contract not found'
            });
        }

        const isParticipant = String(contract.client) === String(userId) ||
            String(contract.freelancer) === String(userId);

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this contract\'s modification requests'
            });
        }

        const requests = await ContractModificationRequest.find({ contract: contractId })
            .populate('requestedBy', 'first_name last_name email profile_picture')
            .populate('requestedTo', 'first_name last_name email profile_picture')
            .populate('job', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });

    } catch (error) {
        console.error('Get modification requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * Get all modification requests for current user (as freelancer or client)
 */
const getMyModificationRequests = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { status, role } = req.query;

        let query = {
            $or: [
                { requestedBy: userId },
                { requestedTo: userId }
            ]
        };

        if (status) {
            query.status = status;
        }

        if (role === 'freelancer') {
            query = { requestedBy: userId };
            if (status) query.status = status;
        } else if (role === 'client') {
            query = { requestedTo: userId };
            if (status) query.status = status;
        }

        const requests = await ContractModificationRequest.find(query)
            .populate('requestedBy', 'first_name last_name email profile_picture')
            .populate('requestedTo', 'first_name last_name email profile_picture')
            .populate('contract', 'agreedAmount agreedDeliveryTime status')
            .populate('job', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests
        });

    } catch (error) {
        console.error('Get my modification requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * Get single modification request by ID
 */
const getModificationRequestById = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { requestId } = req.params;

        const request = await ContractModificationRequest.findById(requestId)
            .populate('requestedBy', 'first_name last_name email profile_picture')
            .populate('requestedTo', 'first_name last_name email profile_picture')
            .populate('contract', 'agreedAmount agreedDeliveryTime status startDate')
            .populate('job', 'title description');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Modification request not found'
            });
        }

        // Verify user is part of the request
        const isParticipant = String(request.requestedBy._id) === String(userId) ||
            String(request.requestedTo._id) === String(userId);

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this modification request'
            });
        }

        res.status(200).json({
            success: true,
            data: request
        });

    } catch (error) {
        console.error('Get modification request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

/**
 * Cancel a pending modification request (Freelancer only)
 */
const cancelModificationRequest = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { requestId } = req.params;

        const request = await ContractModificationRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Modification request not found'
            });
        }

        // Only the requester (freelancer) can cancel
        if (String(request.requestedBy) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Only the requester can cancel this request'
            });
        }

        // Can only cancel pending requests
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only cancel pending requests'
            });
        }

        await ContractModificationRequest.findByIdAndDelete(requestId);

        res.status(200).json({
            success: true,
            message: 'Modification request cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel modification request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    createModificationRequest,
    respondToModificationRequest,
    getModificationRequestsByContract,
    getMyModificationRequests,
    getModificationRequestById,
    cancelModificationRequest
};
