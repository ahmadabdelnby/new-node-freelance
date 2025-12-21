//ahmed-dev branch
const contract = require('../Models/Contract');
const jwt = require('jsonwebtoken');
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
            .populate('job', 'title description category budget')
            .populate('client', 'first_name last_name email profile_picture')
            .populate('freelancer', 'first_name last_name email profile_picture')
            .populate('proposal', 'bidAmount coverLetter estimatedDuration')
            .sort({ createdAt: -1 });
            
        //my contracts as a freelancer
        const freelancerContracts = await contract.find({ freelancer: userId })
            .populate('job', 'title description category budget')
            .populate('client', 'first_name last_name email profile_picture')
            .populate('freelancer', 'first_name last_name email profile_picture')
            .populate('proposal', 'bidAmount coverLetter estimatedDuration')
            .sort({ createdAt: -1 });

        if (clientContracts.length === 0 && freelancerContracts.length === 0) {
            return res.status(404).json({ message: "No contracts found for this user" });
        }

        res.status(200).json({
            clientContracts,
            freelancerContracts
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
            .populate('job', 'title description category budget skills')
            .populate('client', 'first_name last_name email profile_picture')
            .populate('freelancer', 'first_name last_name email profile_picture')
            .populate('proposal', 'bidAmount coverLetter estimatedDuration');
            
        if (!foundContract) {
            return res.status(404).json({ message: 'Contract not found' });
        }
        res.status(200).json(foundContract);
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

        // Update freelancer's completed jobs count and add payment to balance
        const User = require('../Models/User');
        const Payment = require('../Models/Payment');
        
        // Find the payment to get net amount
        const contractPayment = await Payment.findOne({
            contract: Contract._id,
            status: 'held',
            isEscrow: true
        });
        
        const paymentToAdd = contractPayment ? contractPayment.netAmount : (Contract.agreedAmount * 0.90);
        
        await User.findByIdAndUpdate(
            Contract.freelancer,
            { 
                $inc: { 
                    completedJobs: 1,
                    balance: paymentToAdd,
                    totalEarnings: paymentToAdd
                } 
            }
        );
        console.log('✅ Freelancer completed jobs incremented and balance updated (+' + paymentToAdd + ')');

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
                
                // Release payment from escrow
                escrowPayment.status = 'released';
                escrowPayment.releasedAt = new Date();
                await escrowPayment.save();

                // Process the payment (mock gateway)
                const mockPaymentGateway = async (amount) => {
                    // Simulate processing delay
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return {
                        success: true,
                        transactionId: 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                        message: 'Payment released successfully from escrow'
                    };
                };

                const result = await mockPaymentGateway(escrowPayment.netAmount);
                
                if (result.success) {
                    escrowPayment.status = 'completed';
                    escrowPayment.transactionId = result.transactionId;
                    escrowPayment.completedAt = new Date();
                    escrowPayment.processedAt = new Date();
                    await escrowPayment.save();
                    
                    console.log('✅ Payment completed:', escrowPayment.transactionId);
                } else {
                    console.error('❌ Payment processing failed:', result.message);
                }
            } else {
                console.log('⚠️ No escrow payment found for this contract');
            }
        } catch (paymentError) {
            console.error('⚠️ Error releasing payment:', paymentError.message);
            // Don't fail contract completion if payment fails
        }

        // 🔥 UPDATE JOB STATUS
        try {
            const Job = require('../Models/Jobs');
            await Job.findByIdAndUpdate(Contract.job, {
                status: 'completed',
                closedAt: new Date()
            });
            console.log('✅ Job marked as completed');
        } catch (jobError) {
            console.error('⚠️ Error updating job:', jobError.message);
        }

        // 🔥 SEND NOTIFICATIONS
        try {
            const Notification = require('../Models/notification');
            
            // Notify freelancer about payment release
            await Notification.create({
                user: Contract.freelancer,
                type: 'payment_released',
                title: 'Payment Released!',
                message: `The client has completed the contract and your payment has been released.`,
                link: `/contracts/${Contract._id}`,
                relatedContract: Contract._id
            });

            // Notify client about completion
            await Notification.create({
                user: Contract.client,
                type: 'contract_completed',
                title: 'Contract Completed',
                message: `You have successfully completed the contract. Please leave a review for the freelancer.`,
                link: `/contracts/${Contract._id}`,
                relatedContract: Contract._id
            });

            console.log('✅ Notifications sent');
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

        // Send notification to client
        const io = req.app.get('io');
        if (io) {
            io.to(foundContract.client.toString()).emit('notification', {
                type: 'work_submitted',
                message: 'Freelancer has submitted work for review',
                contractId: foundContract._id,
                timestamp: new Date()
            });
        }

        res.status(200).json({
            message: 'Work submitted successfully',
            deliverable: foundContract.deliverables[foundContract.deliverables.length - 1],
            contract: foundContract
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
        const foundContract = await contract.findById(contractId).populate('freelancer client');
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

        const io = req.app.get('io');

        if (action === 'accept') {
            deliverable.status = 'accepted';
            
            // Complete the contract
            foundContract.status = 'completed';
            foundContract.completedAt = new Date();
            
            await foundContract.save();

            // Update payment status and release funds
            const Payment = require('../Models/Payment');
            const User = require('../Models/User');
            
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
                    { $inc: { balance: netAmount } }
                );

                console.log(`💰 Released $${netAmount} to freelancer ${foundContract.freelancer._id}`);
            }

            // Send notification to freelancer
            if (io) {
                io.to(foundContract.freelancer._id.toString()).emit('notification', {
                    type: 'work_accepted',
                    message: 'Your work has been accepted! Payment released.',
                    contractId: foundContract._id,
                    timestamp: new Date()
                });
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

            // Send notification to freelancer
            if (io) {
                io.to(foundContract.freelancer._id.toString()).emit('notification', {
                    type: 'revision_requested',
                    message: 'Client has requested revisions',
                    contractId: foundContract._id,
                    revisionNote,
                    timestamp: new Date()
                });
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
        console.error('Error reviewing work:', error);
        res.status(500).json({ error: error.message });
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
    reviewWork
};