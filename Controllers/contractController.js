//ahmed-dev branch
const contract = require('../Models/Contract');
const jwt = require('jsonwebtoken');
const { getIO } = require('../services/socketService');
/****************************************************************************************************/
// Create a new contract
const createContract = async (req, res) => {
    try {
        const { job, client, freelancer, proposal, agreedAmount, budgetType } = req.body;
        const newContract = new contract({
            job,
            client,
            freelancer,
            proposal,
            agreedAmount,
            budgetType
        });
        await newContract.save();
        res.status(201).json(newContract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
/****************************************************************************************************/
//Get My contracts
const getMyContracts = async (req, res) => {
    try {
        console.log(req.user);
        const userId = req.user.id;

        //my contracts as a client
        const clientContracts = await contract.find({ client: userId })
            .populate('job', 'title description category budget deadline duration')
            .populate('client')
            .populate('freelancer')
            .populate('proposal', 'bidAmount coverLetter deliveryTime')
            .sort({ createdAt: -1 });

        //my contracts as a freelancer
        const freelancerContracts = await contract.find({ freelancer: userId })
            .populate('job', 'title description category budget deadline duration')
            .populate('client')
            .populate('freelancer')
            .populate('proposal', 'bidAmount coverLetter deliveryTime')
            .sort({ createdAt: -1 });

        if (clientContracts.length === 0 && freelancerContracts.length === 0) {
            return res.status(404).json({ message: "No contracts found for this user" });
        }

        // 🔥 Add computed fields for backward compatibility
        const addComputedFields = (contracts) => contracts.map(c => {
            const obj = c.toObject();
            // Use agreedDeliveryTime from contract, fallback to proposal if not set
            obj.deliveryTime = obj.agreedDeliveryTime || obj.proposal?.deliveryTime;
            obj.deadline = obj.calculatedDeadline || obj.deadline;
            return obj;
        });

        res.status(200).json({
            clientContracts: addComputedFields(clientContracts),
            freelancerContracts: addComputedFields(freelancerContracts)
        });
    } catch (err) {
        console.error("Error fetching contracts:", err);
        res.status(500).json({ message: "Server error while fetching contracts" });
    }
}
/****************************************************************************************************/
// Get contract by ID
const getContractById = async (req, res) => {
    try {
        const { id } = req.params;
        const foundContract = await contract.findById(id)
            .populate('job', 'title description category budget skills deadline duration')
            .populate('client')
            .populate('freelancer')
            .populate('proposal', 'bidAmount coverLetter deliveryTime');

        if (!foundContract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        // 🔥 Add computed fields for backward compatibility
        const contractObj = foundContract.toObject();
        contractObj.deliveryTime = contractObj.agreedDeliveryTime || contractObj.proposal?.deliveryTime;
        contractObj.deadline = contractObj.calculatedDeadline || contractObj.deadline;

        res.status(200).json(contractObj);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
/****************************************************************************************************/
// Update contract by ID
const updateContractById = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedContract = await contract.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedContract) {
            return res.status(404).json({ message: 'Contract not found' });
        }
        res.status(200).json(updatedContract);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
/****************************************************************************************************/
// Delete contract by ID
const deleteContractById = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedContract = await contract.findByIdAndDelete(id);
        if (!deletedContract) {
            return res.status(404).json({ message: 'Contract not found' });
        }
        res.status(200).json({ message: 'Contract deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
/****************************************************************************************************/
// Get all contracts for admin dashboard
//note: dahboard is only for a logged in admin, make sure to check the role and the id from token
const getAllContracts = async (req, res) => {
    try {
        const contracts = await contract.find()
            .populate("client", "email")
            .populate("freelancer", "email");
        res.status(200).json(contracts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
/****************************************************************************************************/
// Complete contract
const completeContract = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const Contract = await contract.findById(id);
        if (!Contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        // Only client or admin can complete contract
        if (!Contract.client.equals(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only the client can complete this contract' });
        }

        if (Contract.status === 'completed') {
            return res.status(400).json({ message: 'Contract already completed' });
        }

        if (Contract.status === 'terminated') {
            return res.status(400).json({ message: 'Cannot complete a terminated contract' });
        }

        console.log('✅ Starting contract completion:', id);

        Contract.status = 'completed';
        Contract.completedAt = new Date();
        await Contract.save();

        // Update the related Job status to 'completed'
        const Job = require('../Models/Jobs');
        try {
            await Job.findByIdAndUpdate(
                Contract.job,
                { status: 'completed' }
            );
            console.log('✅ Job status updated to completed');
        } catch (jobError) {
            console.error('⚠️ Error updating job status:', jobError);
        }

        // Update freelancer's completed jobs count (balance will be updated by releasePayment)
        const User = require('../Models/User');

        await User.findByIdAndUpdate(
            Contract.freelancer,
            {
                $inc: {
                    completedJobs: 1
                }
            }
        );
        console.log('✅ Freelancer completed jobs incremented');

        // Update Client completedJobsAsClient
        await User.findByIdAndUpdate(
            Contract.client,
            {
                $inc: {
                    completedJobsAsClient: 1
                }
            }
        );
        console.log('📊 Client completedJobsAsClient incremented');

        // 🔥 RELEASE PAYMENT FROM ESCROW
        try {
            const Payment = require('../Models/Payment');

            // Find the escrow payment for this contract
            const escrowPayment = await Payment.findOne({
                contract: Contract._id,
                status: 'held',
                isEscrow: true
            });

            if (escrowPayment) {
                console.log('✅ Found escrow payment:', escrowPayment._id);

                // Calculate amounts
                const platformFee = escrowPayment.platformFee || 0;
                const freelancerAmount = escrowPayment.amount - platformFee;

                console.log(`💵 Releasing payment: Total=$${escrowPayment.amount}, Fee=$${platformFee}, Freelancer=$${freelancerAmount}`);

                // Add amount to freelancer balance (minus platform fee)
                await User.updateOne(
                    { _id: Contract.freelancer },
                    { $inc: { balance: freelancerAmount, totalEarnings: freelancerAmount } }
                );

                // Update payment status
                escrowPayment.status = 'released';
                escrowPayment.completedAt = new Date();
                escrowPayment.releasedAt = new Date();
                escrowPayment.transactionId = 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                await escrowPayment.save();

                console.log('✅ Payment released from escrow:', escrowPayment.transactionId);
            } else {
                console.log('⚠️ No escrow payment found for this contract');
            }
        } catch (paymentError) {
            console.error('⚠️ Error releasing payment:', paymentError.message);
            // Don't fail contract completion if payment fails
        }

        // 🔥 UPDATE JOB STATUS TO COMPLETED
        // PROFESSIONAL: Completed jobs are removed from public listings
        // They only appear in client/freelancer dashboards for reference and reviews
        try {
            const Job = require('../Models/Jobs');
            await Job.findByIdAndUpdate(Contract.job, {
                status: 'completed',
                closedAt: new Date()
            });
            console.log('✅ Job marked as completed - Removed from public listings');
        } catch (jobError) {
            console.error('⚠️ Error updating job:', jobError.message);
        }

        // 🔥 SEND NOTIFICATIONS
        try {
            const Notification = require('../Models/notification');
            const { getIO } = require('../services/socketService');

            // Notify freelancer about payment release
            await Notification.create({
                user: Contract.freelancer,
                type: 'payment_released',
                content: `Payment has been released to you! Check your wallet`,
                linkUrl: `/contracts/${Contract._id}`,
                category: 'payment',
                relatedContract: Contract._id
            });

            // Notify client about completion
            await Notification.create({
                user: Contract.client,
                type: 'contract_completed',
                content: `Contract completed successfully. Please leave a review for the freelancer`,
                linkUrl: `/contracts/${Contract._id}`,
                category: 'contract',
                relatedContract: Contract._id
            });

            // Send Socket.io notifications
            const io = getIO();
            if (io) {
                // Notify freelancer about payment
                io.to(`user:${Contract.freelancer}`).emit('payment_released', {
                    contractId: Contract._id,
                    amount: netAmount
                });
                io.to(`user:${Contract.freelancer}`).emit('notification', {
                    type: 'payment_released',
                    contractId: Contract._id,
                    amount: netAmount
                });

                // Notify client about completion
                io.to(`user:${Contract.client}`).emit('contract_completed', {
                    contractId: Contract._id
                });
                io.to(`user:${Contract.client}`).emit('notification', {
                    type: 'contract_completed',
                    contractId: Contract._id
                });
            }

            console.log('✅ Contract completion notifications sent');
        } catch (notifError) {
            console.error('⚠️ Failed to send notifications:', notifError.message);
        }

        // 🔥 SEND EMAILS
        try {
            const { sendEmail, emailTemplates } = require('../services/emailService');

            // Get freelancer and client info
            const freelancer = await User.findById(Contract.freelancer);
            const client = await User.findById(Contract.client);
            const Job = require('../Models/Jobs');
            const job = await Job.findById(Contract.job);

            if (freelancer && freelancer.email && job) {
                const template = emailTemplates.paymentReleased(
                    freelancer.first_name,
                    job.title,
                    Contract.agreedAmount,
                    Contract._id
                );
                sendEmail({
                    to: freelancer.email,
                    subject: template.subject,
                    html: template.html
                });
            }

            if (client && client.email && job) {
                const template = emailTemplates.contractCompleted(
                    client.first_name,
                    job.title,
                    freelancer?.first_name || 'the freelancer',
                    Contract._id
                );
                sendEmail({
                    to: client.email,
                    subject: template.subject,
                    html: template.html
                });
            }

            console.log('✅ Emails sent');
        } catch (emailError) {
            console.error('⚠️ Failed to send emails:', emailError.message);
        }

        // Populate contract data for response
        await Contract.populate([
            { path: 'job', select: 'title description' },
            { path: 'client', select: 'first_name last_name email' },
            { path: 'freelancer', select: 'first_name last_name email' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Contract completed successfully and payment released to freelancer',
            contract: Contract
        });
    } catch (error) {
        console.error('❌ Error completing contract:', error);
        res.status(500).json({ error: error.message });
    }
};
/****************************************************************************************************/
// Update hours worked (for hourly contracts)
const updateHoursWorked = async (req, res) => {
    try {
        const { id } = req.params;
        const { hoursWorked } = req.body;
        const userId = req.user.id;

        if (!hoursWorked || hoursWorked < 0) {
            return res.status(400).json({ message: 'Valid hours worked is required' });
        }

        const Contract = await contract.findById(id);
        if (!Contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        // Only freelancer can update hours worked
        if (!Contract.freelancer.equals(userId)) {
            return res.status(403).json({ message: 'Only the freelancer can update hours worked' });
        }

        if (Contract.budgetType !== 'hourly') {
            return res.status(400).json({ message: 'This contract is not hourly-based' });
        }

        if (Contract.status === 'completed' || Contract.status === 'terminated') {
            return res.status(400).json({ message: 'Cannot update hours on a closed contract' });
        }

        Contract.hoursWorked = hoursWorked;
        await Contract.save();

        res.status(200).json({
            message: 'Hours worked updated successfully',
            contract: Contract
        });
    } catch (error) {
        console.error('Error updating hours worked:', error);
        res.status(500).json({ error: error.message });
    }
};
/****************************************************************************************************/
// Submit work deliverables (Freelancer only)
const submitWork = async (req, res) => {
    try {
        const { contractId } = req.params;
        const { description, files } = req.body; // files = [{name, url, size, type}]
        const freelancerId = req.user._id || req.user.id;

        console.log('📦 Submit Work Request:', { description, files, filesType: typeof files, isArray: Array.isArray(files) });

        // Parse files if it's a string
        let parsedFiles = files;
        if (typeof files === 'string') {
            try {
                parsedFiles = JSON.parse(files);
            } catch (e) {
                console.error('Failed to parse files:', e);
                parsedFiles = [];
            }
        }

        // Find contract and verify permissions
        const foundContract = await contract.findById(contractId);
        if (!foundContract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        // Only freelancer can submit work
        if (foundContract.freelancer.toString() !== freelancerId.toString()) {
            return res.status(403).json({ message: 'Only the freelancer can submit work' });
        }

        // Check contract status
        if (foundContract.status !== 'active') {
            return res.status(400).json({ message: 'Can only submit work for active contracts' });
        }

        // Create new deliverable
        const newDeliverable = {
            submittedBy: freelancerId,
            description,
            files: parsedFiles || [],
            status: 'pending_review',
            submittedAt: new Date()
        };

        console.log('📤 New Deliverable:', newDeliverable);

        foundContract.deliverables.push(newDeliverable);
        foundContract.deliveredAt = new Date();

        await foundContract.save();

        const Notification = require('../Models/notification');
        const { getIO } = require('../services/socketService');
        const emailService = require('../services/emailService');
        const populatedContract = await contract.findById(contractId)
            .populate('client', 'first_name last_name email')
            .populate('freelancer', 'first_name last_name email')
            .populate('job', 'title');

        // Create notification for client about deliverable submission
        await Notification.create({
            user: populatedContract.client._id,
            type: 'deliverable_submitted',
            content: `${populatedContract.freelancer.first_name} has submitted work for "${populatedContract.job?.title || 'your project'}"`,
            linkUrl: `/contracts/${contractId}`,
            category: 'contract',
            relatedContract: contractId
        });

        // Send Socket.io notification
        const io = getIO();
        if (io) {
            // Notify client about work submission
            io.to(`user:${populatedContract.client._id}`).emit('deliverable_submitted', {
                contractId: contractId,
                freelancerName: populatedContract.freelancer.first_name,
                jobTitle: populatedContract.job?.title
            });

            // Also emit contract_updated to refresh the contract details in real-time
            io.to(`user:${populatedContract.client._id}`).emit('contract_updated', {
                contractId: contractId,
                contract: populatedContract
            });

            io.to(`user:${populatedContract.freelancer._id}`).emit('contract_updated', {
                contractId: contractId,
                contract: populatedContract
            });
        }

        console.log(`🔔 Deliverable submission notification sent to client`);

        // Send email to client
        try {
            await emailService.sendWorkSubmittedEmail(
                populatedContract.client.email,
                {
                    clientName: populatedContract.client.first_name,
                    freelancerName: populatedContract.freelancer.first_name,
                    jobTitle: populatedContract.job?.title || 'Contract',
                    contractId: populatedContract._id
                }
            );
            console.log(`📧 Work submitted email sent to client`);
        } catch (emailError) {
            console.error('Error sending work submitted email:', emailError);
        }

        res.status(200).json({
            message: 'Work submitted successfully',
            deliverable: populatedContract.deliverables[populatedContract.deliverables.length - 1],
            contract: populatedContract
        });
    } catch (error) {
        console.error('Error submitting work:', error);
        res.status(500).json({ error: error.message });
    }
};
/****************************************************************************************************/
// Review work (Accept or Request Revision) - Client only
const reviewWork = async (req, res) => {
    try {
        const { contractId, deliverableId } = req.params;
        const { action, revisionNote } = req.body; // action: 'accept' or 'request_revision'
        const clientId = req.user._id || req.user.id;

        // Find contract
        const foundContract = await contract.findById(contractId).populate('freelancer client job');
        if (!foundContract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        // Only client can review work
        if (foundContract.client._id.toString() !== clientId.toString()) {
            return res.status(403).json({ message: 'Only the client can review work' });
        }

        // Find deliverable
        const deliverable = foundContract.deliverables.id(deliverableId);
        if (!deliverable) {
            return res.status(404).json({ message: 'Deliverable not found' });
        }

        // Check if already reviewed
        if (deliverable.status !== 'pending_review') {
            return res.status(400).json({ message: 'This deliverable has already been reviewed' });
        }

        // Update deliverable status
        deliverable.reviewedAt = new Date();
        deliverable.reviewedBy = clientId;

        if (action === 'accept') {
            deliverable.status = 'accepted';

            // Complete the contract
            foundContract.status = 'completed';
            foundContract.completedAt = new Date();

            await foundContract.save();

            // Update payment status and release funds
            const Payment = require('../Models/Payment');
            const User = require('../Models/User');
            const Job = require('../Models/Jobs');
            const Notification = require('../Models/notification');
            const emailService = require('../services/emailService');

            const payment = await Payment.findOne({
                contract: contractId,
                status: 'held'
            });

            if (payment) {
                payment.status = 'completed';
                payment.completedAt = new Date();
                await payment.save();

                // Release funds to freelancer
                const netAmount = payment.amount - payment.platformFee;
                await User.updateOne(
                    { _id: foundContract.freelancer._id },
                    {
                        $inc: {
                            balance: netAmount,
                            totalEarnings: netAmount,
                            completedJobs: 1
                        }
                    }
                );

                console.log(`💰 Released $${netAmount} to freelancer ${foundContract.freelancer._id}`);
                console.log(`📊 Updated freelancer stats: +$${netAmount} earnings, +1 completed job`);
            }

            // Update Client completedJobsAsClient
            await User.updateOne(
                { _id: foundContract.client._id },
                { $inc: { completedJobsAsClient: 1 } }
            );
            console.log(`📊 Updated client stats: +1 completed job as client`);

            // Update Job status to completed
            if (foundContract.job) {
                await Job.findByIdAndUpdate(foundContract.job._id || foundContract.job, {
                    status: 'completed'
                });
                console.log(`✅ Job status updated to completed`);
            } else {
                console.warn(`⚠️ No job associated with contract ${foundContract._id}`);
            }

            // Create notification for freelancer about work acceptance
            await Notification.create({
                user: foundContract.freelancer._id,
                type: 'deliverable_accepted',
                content: `Your work has been accepted! Payment of $${payment ? (payment.amount - payment.platformFee).toFixed(2) : foundContract.agreedAmount} released`,
                linkUrl: `/contracts/${foundContract._id}`,
                category: 'contract',
                relatedContract: foundContract._id
            });

            // Send Socket.io notification to freelancer
            const io = getIO();
            if (io) {
                io.to(`user:${foundContract.freelancer._id}`).emit('deliverable_accepted', {
                    contractId: foundContract._id,
                    amount: payment ? (payment.amount - payment.platformFee).toFixed(2) : foundContract.agreedAmount
                });

                // Send contract_updated event to client for timeline update
                io.to(`user:${foundContract.client._id}`).emit('contract_updated', {
                    contractId: foundContract._id,
                    status: 'completed'
                });
            }

            console.log(`🔔 Work accepted notification sent to freelancer and client`);

            // Send email to freelancer
            try {
                if (foundContract.freelancer && foundContract.freelancer.email) {
                    await emailService.sendWorkAcceptedEmail(
                        foundContract.freelancer.email,
                        {
                            freelancerName: foundContract.freelancer.first_name || 'Freelancer',
                            clientName: foundContract.client.first_name || 'Client',
                            jobTitle: foundContract.job?.title || 'Contract',
                            amount: payment ? (payment.amount - payment.platformFee).toFixed(2) : foundContract.agreedAmount,
                            contractId: foundContract._id
                        }
                    );
                    console.log(`📧 Work accepted email sent to freelancer`);
                } else {
                    console.warn(`⚠️ Freelancer email not available for contract ${foundContract._id}`);
                }
            } catch (emailError) {
                console.error('⚠️ Error sending work accepted email:', emailError.message);
            }

            res.status(200).json({
                message: 'Work accepted and contract completed',
                contract: foundContract,
                deliverable
            });

        } else if (action === 'request_revision') {
            if (!revisionNote) {
                return res.status(400).json({ message: 'Revision note is required' });
            }

            deliverable.status = 'revision_requested';
            deliverable.revisionNote = revisionNote;

            await foundContract.save();

            const Notification = require('../Models/notification');
            const { getIO } = require('../services/socketService');
            const emailService = require('../services/emailService');

            // Create notification for freelancer about revision request
            await Notification.create({
                user: foundContract.freelancer._id,
                type: 'deliverable_rejected',
                content: `Client has requested revisions for your work`,
                linkUrl: `/contracts/${foundContract._id}`,
                category: 'contract',
                relatedContract: foundContract._id
            });

            // Send Socket.io notification to freelancer
            const io = getIO();
            if (io) {
                io.to(`user:${foundContract.freelancer._id}`).emit('deliverable_rejected', {
                    contractId: foundContract._id,
                    revisionNote: revisionNote
                });

                // Send contract_updated event to client for timeline update
                io.to(`user:${foundContract.client._id}`).emit('contract_updated', {
                    contractId: foundContract._id,
                    status: 'revision_requested'
                });
            }

            console.log(`🔔 Revision request notification sent to freelancer and client`);

            // Send email to freelancer
            try {
                await emailService.sendRevisionRequestedEmail(
                    foundContract.freelancer.email,
                    {
                        freelancerName: foundContract.freelancer.first_name,
                        clientName: foundContract.client.first_name,
                        jobTitle: foundContract.job?.title || 'Contract',
                        revisionNote: revisionNote,
                        contractId: foundContract._id
                    }
                );
                console.log(`📧 Revision requested email sent to freelancer`);
            } catch (emailError) {
                console.error('Error sending revision requested email:', emailError);
            }

            res.status(200).json({
                message: 'Revision requested',
                contract: foundContract,
                deliverable
            });
        } else {
            return res.status(400).json({ message: 'Invalid action. Use "accept" or "request_revision"' });
        }

    } catch (error) {
        console.error('❌ Error reviewing work:', error);
        res.status(500).json({
            message: 'Server error while reviewing work',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
/****************************************************************************************************/
// Admin: Cancel contract and refund to client
const adminCancelContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;

        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can perform this action' });
        }

        const Contract = await contract.findById(id)
            .populate('client', 'first_name last_name email balance')
            .populate('freelancer', 'first_name last_name email');

        if (!Contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        if (Contract.status === 'completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed contract' });
        }

        if (Contract.status === 'terminated') {
            return res.status(400).json({ message: 'Contract is already terminated' });
        }

        console.log('🚫 Admin cancelling contract:', id);

        // Find and refund escrow payment to client
        const Payment = require('../Models/Payment');
        const User = require('../Models/User');
        
        const escrowPayment = await Payment.findOne({
            contract: Contract._id,
            status: 'held',
            isEscrow: true
        });

        let refundAmount = 0;

        if (escrowPayment) {
            refundAmount = escrowPayment.amount;
            console.log(`💰 Refunding $${refundAmount} to client`);

            // Refund to client balance
            await User.updateOne(
                { _id: Contract.client._id },
                { $inc: { balance: refundAmount } }
            );

            // Update payment status
            escrowPayment.status = 'refunded';
            escrowPayment.refundedAt = new Date();
            escrowPayment.refundReason = reason || 'Admin cancelled contract';
            await escrowPayment.save();

            console.log('✅ Payment refunded to client');
        }

        // Update contract status
        Contract.status = 'terminated';
        Contract.terminatedAt = new Date();
        Contract.terminationReason = reason || 'Cancelled by admin';
        Contract.terminatedBy = adminId;
        await Contract.save();

        // Update job status back to open
        const Job = require('../Models/Jobs');
        await Job.findByIdAndUpdate(Contract.job, { status: 'open' });

        // Send notifications
        const Notification = require('../Models/notification');
        
        // Notify client
        await Notification.create({
            user: Contract.client._id,
            type: 'contract_cancelled',
            content: `Your contract has been cancelled by admin. ${refundAmount > 0 ? `$${refundAmount} has been refunded to your balance.` : ''}`,
            linkUrl: `/contracts/${Contract._id}`
        });

        // Notify freelancer
        await Notification.create({
            user: Contract.freelancer._id,
            type: 'contract_cancelled',
            content: `Contract cancelled by admin. Reason: ${reason || 'No reason provided'}`,
            linkUrl: `/contracts/${Contract._id}`
        });

        res.status(200).json({
            message: 'Contract cancelled and payment refunded successfully',
            contract: Contract,
            refundAmount
        });

    } catch (error) {
        console.error('❌ Error cancelling contract:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
/****************************************************************************************************/
// Admin: Update contract amount (for disputes)
const adminUpdateContractAmount = async (req, res) => {
    try {
        const { id } = req.params;
        const { newAmount, reason } = req.body;

        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can perform this action' });
        }

        if (!newAmount || newAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const Contract = await contract.findById(id)
            .populate('client', 'first_name last_name email balance')
            .populate('freelancer', 'first_name last_name email');

        if (!Contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        if (Contract.status === 'completed') {
            return res.status(400).json({ message: 'Cannot modify a completed contract' });
        }

        if (Contract.status === 'terminated') {
            return res.status(400).json({ message: 'Cannot modify a terminated contract' });
        }

        const oldAmount = Contract.agreedAmount;
        const amountDifference = newAmount - oldAmount;

        console.log(`💱 Admin updating contract amount: $${oldAmount} → $${newAmount} (diff: $${amountDifference})`);

        // Update escrow payment if exists
        const Payment = require('../Models/Payment');
        const User = require('../Models/User');

        const escrowPayment = await Payment.findOne({
            contract: Contract._id,
            status: 'held',
            isEscrow: true
        });

        if (escrowPayment) {
            // If reducing amount, refund difference to client
            if (amountDifference < 0) {
                const refundAmount = Math.abs(amountDifference);
                await User.updateOne(
                    { _id: Contract.client._id },
                    { $inc: { balance: refundAmount } }
                );
                console.log(`💰 Refunded $${refundAmount} to client (amount reduced)`);
            }
            // If increasing amount, the client needs to add more funds - just update escrow for now
            
            // Update escrow payment amount
            escrowPayment.amount = newAmount;
            escrowPayment.platformFee = newAmount * 0.10; // 10% platform fee
            escrowPayment.notes = (escrowPayment.notes || '') + `\n[Admin] Amount changed from $${oldAmount} to $${newAmount}. Reason: ${reason || 'No reason'}`;
            await escrowPayment.save();
        }

        // Update contract
        Contract.agreedAmount = newAmount;
        Contract.amountHistory = Contract.amountHistory || [];
        Contract.amountHistory.push({
            oldAmount,
            newAmount,
            changedAt: new Date(),
            changedBy: req.user.id,
            reason: reason || 'Admin adjustment'
        });
        await Contract.save();

        // Send notifications
        const Notification = require('../Models/notification');
        
        await Notification.create({
            user: Contract.client._id,
            type: 'contract_updated',
            content: `Contract amount updated from $${oldAmount} to $${newAmount} by admin. ${amountDifference < 0 ? `$${Math.abs(amountDifference)} refunded to your balance.` : ''}`,
            linkUrl: `/contracts/${Contract._id}`
        });

        await Notification.create({
            user: Contract.freelancer._id,
            type: 'contract_updated',
            content: `Contract amount updated from $${oldAmount} to $${newAmount} by admin.`,
            linkUrl: `/contracts/${Contract._id}`
        });

        res.status(200).json({
            message: 'Contract amount updated successfully',
            contract: Contract,
            oldAmount,
            newAmount,
            amountDifference
        });

    } catch (error) {
        console.error('❌ Error updating contract amount:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
/****************************************************************************************************/
// Admin: Force complete contract and release payment
const adminCompleteContract = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can perform this action' });
        }

        const Contract = await contract.findById(id)
            .populate('client', 'first_name last_name email')
            .populate('freelancer', 'first_name last_name email');

        if (!Contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        if (Contract.status === 'completed') {
            return res.status(400).json({ message: 'Contract already completed' });
        }

        if (Contract.status === 'terminated') {
            return res.status(400).json({ message: 'Cannot complete a terminated contract' });
        }

        console.log('✅ Admin completing contract:', id);

        // Use the existing completeContract logic but force it
        Contract.status = 'completed';
        Contract.completedAt = new Date();
        Contract.completedBy = req.user.id;
        Contract.completionReason = reason || 'Completed by admin';
        await Contract.save();

        // Update job status
        const Job = require('../Models/Jobs');
        await Job.findByIdAndUpdate(Contract.job, { status: 'completed' });

        // Update freelancer stats
        const User = require('../Models/User');
        await User.findByIdAndUpdate(Contract.freelancer._id, {
            $inc: { completedJobs: 1 }
        });

        // Release escrow payment
        const Payment = require('../Models/Payment');
        const escrowPayment = await Payment.findOne({
            contract: Contract._id,
            status: 'held',
            isEscrow: true
        });

        let releasedAmount = 0;

        if (escrowPayment) {
            const platformFee = escrowPayment.platformFee || 0;
            releasedAmount = escrowPayment.amount - platformFee;

            // Add to freelancer balance
            await User.updateOne(
                { _id: Contract.freelancer._id },
                { $inc: { balance: releasedAmount, totalEarnings: releasedAmount } }
            );

            escrowPayment.status = 'released';
            escrowPayment.releasedAt = new Date();
            escrowPayment.transactionId = 'ADM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            await escrowPayment.save();

            console.log(`✅ Released $${releasedAmount} to freelancer`);
        }

        // Send notifications
        const Notification = require('../Models/notification');
        
        await Notification.create({
            user: Contract.client._id,
            type: 'contract_completed',
            content: `Contract has been completed by admin. ${reason ? `Reason: ${reason}` : ''}`,
            linkUrl: `/contracts/${Contract._id}`
        });

        await Notification.create({
            user: Contract.freelancer._id,
            type: 'contract_completed',
            content: `Contract completed by admin! $${releasedAmount} has been added to your balance.`,
            linkUrl: `/contracts/${Contract._id}`
        });

        res.status(200).json({
            message: 'Contract completed and payment released successfully',
            contract: Contract,
            releasedAmount
        });

    } catch (error) {
        console.error('❌ Error completing contract:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
/****************************************************************************************************/
module.exports = {
    createContract,
    getMyContracts,
    getContractById,
    updateContractById,
    deleteContractById,
    getAllContracts,
    completeContract,
    updateHoursWorked,
    submitWork,
    reviewWork,
    adminCancelContract,
    adminUpdateContractAmount,
    adminCompleteContract
};