const Proposal = require('../Models/proposals')
const Job = require('../Models/Jobs');

/**********************************************************CREATING********************************************************/
const createProposal = async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    const freelancerId = req.user.id;

    const { jobId, coverLetter, message, bidAmount, deliveryTime } = req.body;

    // Validate input
    if (!jobId || !coverLetter || !bidAmount || !deliveryTime) {
      return res.status(400).json({ message: 'All fields are required: jobId, coverLetter, bidAmount, deliveryTime.' });
    }

    // Check job existence and status
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found.' });

    // 🔥 PROFESSIONAL: Only allow proposals on OPEN jobs
    // Jobs with status 'in_progress', 'completed', or 'cancelled' should not accept new proposals
    if (job.status !== 'open') {
      return res.status(400).json({
        message: `This job is ${job.status} and no longer accepting proposals.`,
        jobStatus: job.status
      });
    }

    // Prevent duplicate proposals
    const existingProposal = await Proposal.findOne({ job_id: jobId, freelancer_id: freelancerId });
    if (existingProposal) {
      return res.status(400).json({ message: 'You have already submitted a proposal for this job.' });
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          url: `/public/uploads/attachments/${file.filename}`,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size
        });
      });
    }

    // Create proposal
    const proposal = await Proposal.create({
      job_id: jobId,
      freelancer_id: freelancerId,
      coverLetter,
      message,
      bidAmount,
      deliveryTime,
      attachments
    });

    // Increment job proposals count
    await Job.findByIdAndUpdate(jobId, { $inc: { proposalsCount: 1 } });

    // 🔥 SEND NOTIFICATION TO CLIENT
    try {
      const Notification = require('../Models/notification');
      const { getIO } = require('../services/socketService');

      await Notification.create({
        user: job.client,
        type: 'new_proposal',
        content: `You received a new proposal for "${job.title}"`,
        linkUrl: `/jobs/${job._id}`,
        category: 'proposal',
        relatedJob: job._id,
        relatedProposal: proposal._id
      });

      // 🔥 Emit real-time notification via Socket.io
      const io = getIO();
      if (io) {
        // Send specific new_proposal event (for toast notification)
        io.to(`user:${job.client}`).emit('new_proposal', {
          jobId: job._id,
          jobTitle: job.title,
          proposalId: proposal._id,
          freelancerId: freelancerId
        });

        // Send generic notification event (to refresh notifications list)
        io.to(`user:${job.client}`).emit('notification', {
          type: 'new_proposal',
          jobId: job._id,
          jobTitle: job.title,
          proposalId: proposal._id
        });

        console.log(`✅ Real-time notification sent to client ${job.client}`);
      }
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      message: 'Proposal submitted successfully.',
      proposal: {
        id: proposal._id,
        job_id: proposal.job_id,
        freelancer_id: proposal.freelancer_id,
        coverLetter: proposal.coverLetter,
        bidAmount: proposal.bidAmount,
        deliveryTime: proposal.deliveryTime,
        attachments: proposal.attachments,
        status: proposal.status,
        createdAt: proposal.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Server error. Could not submit proposal.' });
  }
};
/**********************************************************EDITING********************************************************/
const editProposal = async (req, res) => {
  try {
    const proposalId = req.params.id;
    const { coverLetter, message, bidAmount, deliveryTime } = req.body;

    // Find proposal
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) return res.status(404).json({ message: 'Proposal not found.' });

    // Check ownership
    if (!proposal.freelancer_id.equals(req.user.id)) {
      return res.status(403).json({ message: 'You can only edit your own proposals.' });
    }

    // Check status
    if (['accepted', 'rejected', 'withdrawn'].includes(proposal.status)) {
      return res.status(400).json({ message: 'Cannot edit a proposal that has been processed.' });
    }

    // Update fields if provided
    if (coverLetter) proposal.coverLetter = coverLetter;
    if (message) proposal.message = message;
    if (bidAmount !== undefined) {
      if (bidAmount < 0) return res.status(400).json({ message: 'Bid amount cannot be negative.' });
      proposal.bidAmount = bidAmount;
    }
    if (deliveryTime !== undefined) {
      if (deliveryTime <= 0) return res.status(400).json({ message: 'Delivery time must be greater than 0.' });
      proposal.deliveryTime = deliveryTime;
    }

    await proposal.save();

    res.status(200).json({ message: 'Proposal updated successfully.', proposal });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Server error. Could not update proposal.' });
  }
};
/**********************************************************Delete********************************************************/
// const deleteProposal = async (req, res) => {
//   try {
//     // make sure the user is logged by checking if there is token
//     const freelancerId = req.user?.id;
//     if (!freelancerId) {
//       return res.status(401).json({ message: 'Please login first.' });
//     }

//     const proposalId = req.params.id;

//     // find the proposal in DB
//     const proposal = await Proposal.findById(proposalId);

//     // if it does not exist -> "not found user-id" message
//     if (!proposal) {
//       return res.status(404).json({ message: 'Proposal not found.' });
//     }

//     // make sure the user-id in the payload is the same freelancer-id in proposal collection
//     if (!proposal.freelancer_id.equals(freelancerId)) {
//       // if no match -> "whatever" message
//       return res.status(403).json({ message: 'You can only delete your own proposals.' });
//     }

//     // check proposal status before deletion
//     if (proposal.status !== 'submitted') {
//       return res.status(400).json({ message: 'You can only delete proposals that are still submitted.' });
//     }

//     // if it matches delete
//     await Proposal.findByIdAndDelete(proposalId);

//     res.status(200).json({ message: 'Proposal deleted successfully.' });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error. Could not delete proposal.' });
//   }
// };

/**********************************************************SHOW ALL PROPOSALS********************************************************/
const getMyProposals = async (req, res) => {
  try {
    const freelancerId = req.user.id;

    // Fetch all proposals by this freelancer with complete job and client details
    const proposals = await Proposal.find({ freelancer_id: freelancerId })
      .populate({
        path: 'job_id',
        select: 'title description budget status client',
        populate: {
          path: 'client',
          select: 'first_name last_name email profile_picture profile_picture_url'
        }
      })
      .sort({ createdAt: -1 }); // most recent first

    // Transform to match frontend expectations (job instead of job_id)
    const transformedProposals = proposals.map(proposal => {
      const proposalObj = proposal.toObject();
      proposalObj.job = proposalObj.job_id;
      delete proposalObj.job_id;
      return proposalObj;
    });

    res.status(200).json(transformedProposals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Could not fetch proposals.' });
  }
};
/**********************************************************CHANGE A PROPOSAL STATUS THROUGH HIRE********************************************************/
const hireProposal = async (req, res) => {
  try {
    const proposalId = req.params.id;
    const clientId = req.user.id;

    // Find the proposal
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }

    // Find the job
    const job = await Job.findById(proposal.job_id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    // Check if logged-in user owns the job
    if (job.client.toString() !== clientId) {
      return res.status(403).json({ message: 'You can only hire for your own jobs.' });
    }

    // Check proposal status
    if (proposal.status !== 'submitted' && proposal.status !== 'viewed') {
      console.log('❌ Invalid proposal status:', proposal.status);
      return res.status(400).json({ message: 'This proposal cannot be hired.' });
    }

    console.log('✅ Starting hire process for proposal:', proposalId);

    // 🔥 CHECK CLIENT BALANCE BEFORE CREATING PAYMENT
    const User = require('../Models/User');
    const client = await User.findById(clientId);

    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    const requiredAmount = proposal.bidAmount;

    if (client.balance < requiredAmount) {
      console.log('❌ Insufficient balance:', client.balance, 'Required:', requiredAmount);
      return res.status(400).json({
        message: 'Insufficient balance',
        details: {
          currentBalance: client.balance,
          requiredAmount: requiredAmount,
          shortage: requiredAmount - client.balance
        }
      });
    }

    console.log('✅ Balance check passed:', client.balance, '>=', requiredAmount);

    // Deduct amount from client balance and update totalSpent (use updateOne to bypass password validation)
    await User.updateOne(
      { _id: clientId },
      {
        $inc: {
          balance: -requiredAmount,
          totalSpent: requiredAmount
        }
      }
    );
    console.log('✅ Amount deducted from client balance. New balance:', client.balance - requiredAmount);
    console.log('💰 Client totalSpent updated: +$', requiredAmount);

    // Set the selected proposal as accepted
    proposal.status = 'accepted';
    proposal.respondedAt = new Date();
    await proposal.save();

    // Reject all other submitted proposals for the same job
    await Proposal.updateMany(
      { job_id: job._id, _id: { $ne: proposalId }, status: { $in: ['submitted', 'viewed'] } },
      { $set: { status: 'rejected', respondedAt: new Date() } }
    );

    // 🔥 PROFESSIONAL: Update job status to IN_PROGRESS
    // This prevents new proposals from being submitted and removes job from public listings
    job.status = 'in_progress';
    await job.save();
    console.log('✅ Job status updated to in_progress - No longer accepting proposals');

    // 🔥 AUTO-CREATE CONTRACT
    const Contract = require('../Models/Contract');

    // Calculate deadline based on proposal deliveryTime
    const startDate = new Date();
    const calculatedDeadline = new Date(startDate.getTime() + (proposal.deliveryTime * 24 * 60 * 60 * 1000));

    const contract = new Contract({
      job: job._id,
      client: job.client,
      freelancer: proposal.freelancer_id,
      proposal: proposal._id,
      agreedAmount: proposal.bidAmount,
      budgetType: job.budget.type,
      agreedDeliveryTime: proposal.deliveryTime, // 🔥 From proposal
      calculatedDeadline: calculatedDeadline,    // 🔥 Auto-calculated
      deadline: calculatedDeadline,              // 🔥 For backward compatibility
      status: 'active',
      startDate: startDate,
      description: `Contract for: ${job.title}`
    });
    await contract.save();
    console.log('✅ Contract created:', contract._id);
    console.log('📅 Delivery Time:', proposal.deliveryTime, 'days');
    console.log('📅 Calculated Deadline:', calculatedDeadline.toLocaleDateString());

    // 🔥 AUTO-CREATE PAYMENT IN ESCROW
    const Payment = require('../Models/Payment');

    // Calculate platform fee (10%)
    const platformFee = proposal.bidAmount * 0.10;
    const netAmount = proposal.bidAmount - platformFee;

    const payment = new Payment({
      contract: contract._id,
      payer: job.client,
      payee: proposal.freelancer_id,
      amount: proposal.bidAmount,
      platformFee: platformFee,
      netAmount: netAmount,
      totalAmount: proposal.bidAmount,
      paymentMethod: 'wallet',
      status: 'held', // Money is held in escrow until contract completion
      isEscrow: true,
      description: `Escrow payment for: ${job.title}`,
      processedAt: new Date()
    });
    await payment.save();
    console.log('✅ Payment created in escrow:', payment._id);

    // 🔥 SEND NOTIFICATIONS & SOCKET.IO EVENTS
    try {
      const Notification = require('../Models/notification');
      const { getIO } = require('../services/socketService');

      // Notify freelancer
      const freelancerNotif = await Notification.create({
        user: proposal.freelancer_id,
        type: 'proposal_accepted',
        content: `🎉 Congratulations! Your proposal for "${job.title}" has been accepted. A contract has been created.`,
        linkUrl: `/contracts/${contract._id}`,
        relatedJob: job._id,
        relatedProposal: proposal._id,
        relatedContract: contract._id
      });

      // Notify client
      const clientNotif = await Notification.create({
        user: job.client,
        type: 'contract_created',
        content: `✅ Contract created successfully for "${job.title}" with the selected freelancer.`,
        linkUrl: `/contracts/${contract._id}`,
        relatedJob: job._id,
        relatedProposal: proposal._id,
        relatedContract: contract._id
      });

      console.log('✅ Notifications created in database');

      // 🔥 Send Socket.io real-time notifications
      const io = getIO();
      if (io) {
        // Notify freelancer via Socket.io
        io.to(`user:${proposal.freelancer_id}`).emit('notification', {
          notification: freelancerNotif,
          type: 'proposal_accepted',
          contract: contract
        });

        // Notify client via Socket.io
        io.to(`user:${job.client}`).emit('notification', {
          notification: clientNotif,
          type: 'contract_created',
          contract: contract
        });

        // 🔥 Emit job status change to all users watching this job
        io.emit('job_status_changed', {
          jobId: job._id,
          jobTitle: job.title,
          status: 'in_progress',
          contractId: contract._id
        });

        // 🔥 Emit proposal accepted event for UI updates
        io.emit('proposal_accepted', {
          jobId: job._id,
          jobTitle: job.title,
          proposalId: proposal._id,
          contractId: contract._id,
          freelancerId: proposal.freelancer_id,
          clientId: job.client
        });

        console.log('✅ Socket.io events emitted');
      } else {
        console.warn('⚠️ Socket.io not initialized');
      }

    } catch (notifError) {
      console.error('⚠️ Failed to send notifications:', notifError.message);
      // Don't fail the request if notifications fail
    }

    // 🔥 UPDATE OTHER PROPOSALS TO 'NOT_SELECTED'
    try {
      const otherProposals = await Proposal.find({
        job_id: job._id,
        _id: { $ne: proposal._id },
        status: { $in: ['submitted', 'viewed'] }
      }).populate('freelancer_id', 'first_name email');

      if (otherProposals.length > 0) {
        // Update all other proposals to 'not_selected'
        await Proposal.updateMany(
          {
            job_id: job._id,
            _id: { $ne: proposal._id },
            status: { $in: ['submitted', 'viewed'] }
          },
          {
            $set: {
              status: 'not_selected',
              respondedAt: new Date()
            }
          }
        );

        console.log(`✅ Updated ${otherProposals.length} other proposals to 'not_selected'`);

        // Send notifications to rejected freelancers
        const Notification = require('../Models/notification');
        const { getIO } = require('../services/socketService');
        const io = getIO();

        for (const otherProposal of otherProposals) {
          const rejectionNotif = await Notification.create({
            user: otherProposal.freelancer_id._id,
            type: 'proposal_rejected',
            content: `The client has selected another freelancer for "${job.title}".`,
            linkUrl: `/my-proposals`,
            relatedJob: job._id,
            relatedProposal: otherProposal._id
          });

          // 🔥 Send Socket.io notification to rejected freelancer
          if (io) {
            io.to(`user:${otherProposal.freelancer_id._id}`).emit('notification', {
              notification: rejectionNotif,
              type: 'proposal_rejected'
            });
          }
        }

        console.log('✅ Rejection notifications sent to other freelancers');
      }
    } catch (updateError) {
      console.error('⚠️ Failed to update other proposals:', updateError.message);
    }

    // 🔥 SEND EMAILS
    try {
      const { sendEmail, emailTemplates } = require('../services/emailService');
      const User = require('../Models/User');

      // Get freelancer and client info
      const freelancer = await User.findById(proposal.freelancer_id);
      const client = await User.findById(job.client);

      if (freelancer && freelancer.email) {
        const template = emailTemplates.proposalAccepted(
          freelancer.first_name,
          job.title,
          proposal.bidAmount,
          contract._id
        );
        sendEmail({
          to: freelancer.email,
          subject: template.subject,
          html: template.html
        });
      }

      if (client && client.email) {
        const template = emailTemplates.contractCreated(
          client.first_name,
          job.title,
          freelancer.first_name,
          contract._id
        );
        sendEmail({
          to: client.email,
          subject: template.subject,
          html: template.html
        });
      }

      // Send rejection emails to other freelancers
      const otherProposals = await Proposal.find({
        job_id: job._id,
        _id: { $ne: proposal._id },
        status: 'not_selected'
      }).populate('freelancer_id', 'first_name email');

      for (const otherProposal of otherProposals) {
        if (otherProposal.freelancer_id && otherProposal.freelancer_id.email) {
          const template = emailTemplates.proposalNotSelected(
            otherProposal.freelancer_id.first_name,
            job.title
          );
          sendEmail({
            to: otherProposal.freelancer_id.email,
            subject: template.subject,
            html: template.html
          });
        }
      }

      console.log('✅ Emails sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send emails:', emailError.message);
      // Don't fail the request if emails fail
    }

    // Populate response data
    await contract.populate([
      { path: 'job', select: 'title description budget' },
      { path: 'client', select: 'first_name last_name email' },
      { path: 'freelancer', select: 'first_name last_name email profile_picture' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Freelancer hired successfully. Contract and escrow payment created.',
      hiredProposal: proposal,
      contract: contract,
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        platformFee: payment.platformFee,
        netAmount: payment.netAmount
      }
    });
  } catch (err) {
    console.error('❌ Error in hireProposal:', err);
    console.error('❌ Full error stack:', err.stack);
    res.status(500).json({
      message: 'Server error. Could not hire freelancer.',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

//get all proposals for admin dashboard
const getAllProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find()
      .populate('freelancer_id', 'email');
    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**********************************************************Delete a Proposal********************************************************/
//delete a proposal by admin and user (this needs authorizaion for role user too)
const deleteProposal = async (req, res) => {
  try {
    // Ensure the user is logged in
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: 'Please login first.' });
    }

    const proposalId = req.params.id;

    // Find the proposal
    const proposal = await Proposal.findById(proposalId);

    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }

    // Admin can delete any proposal
    const isAdmin = userRole === 'admin';
    const isOwner = proposal.freelancer_id.equals(userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only delete your own proposals.' });
    }

    // Optional: check status only for non-admins
    if (!isAdmin && proposal.status !== 'submitted') {
      return res.status(400).json({ message: 'You can only delete proposals that are still submitted.' });
    }

    // Delete proposal
    await Proposal.findByIdAndDelete(proposalId);

    res.status(200).json({ message: 'Proposal deleted successfully.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Could not delete proposal.' });
  }
};

/**********************************************************GET PROPOSALS BY JOB********************************************************/
const getProposalsByJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    // Allow all users to view proposals
    const proposals = await Proposal.find({ job_id: jobId })
      .populate('freelancer_id', 'first_name last_name username profile_picture profile_picture_url hourlyRate averageRating completedJobs reviewsCount country portfolio')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: proposals.length,
      proposals
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Could not fetch proposals.' });
  }
};

/**********************************************************WITHDRAW PROPOSAL********************************************************/
const withdrawProposal = async (req, res) => {
  try {
    const proposalId = req.params.id;
    const { withdrawReason } = req.body;

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }

    // Check ownership
    if (!proposal.freelancer_id.equals(req.user.id)) {
      return res.status(403).json({ message: 'You can only withdraw your own proposals.' });
    }

    // Check status
    if (proposal.status !== 'submitted' && proposal.status !== 'viewed') {
      return res.status(400).json({ message: 'Cannot withdraw a proposal that has been accepted or rejected.' });
    }

    proposal.status = 'withdrawn';
    proposal.withdrawReason = withdrawReason || 'No reason provided';
    await proposal.save();

    // Decrement job proposals count
    await Job.findByIdAndUpdate(proposal.job_id, { $inc: { proposalsCount: -1 } });

    res.status(200).json({
      message: 'Proposal withdrawn successfully.',
      proposal
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Could not withdraw proposal.' });
  }
};

/**********************************************************MARK PROPOSAL AS VIEWED********************************************************/
const markProposalAsViewed = async (req, res) => {
  try {
    const proposalId = req.params.id;

    const proposal = await Proposal.findById(proposalId)
      .populate('job_id', 'client');

    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }

    // Only job owner can mark as viewed
    if (!proposal.job_id.client.equals(req.user.id)) {
      return res.status(403).json({ message: 'Only job owner can mark proposals as viewed.' });
    }

    // Only mark if not already viewed
    if (proposal.status === 'submitted') {
      proposal.status = 'viewed';
      proposal.viewedAt = new Date();
      await proposal.save();
    }

    res.status(200).json({
      message: 'Proposal marked as viewed.',
      proposal
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Could not mark proposal as viewed.' });
  }
};

/**********************************************************REJECT PROPOSAL********************************************************/
const rejectProposal = async (req, res) => {
  try {
    const proposalId = req.params.id;
    const { rejectionReason } = req.body;
    const clientId = req.user.id;

    // Find the proposal
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }

    // Find the job
    const job = await Job.findById(proposal.job_id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    // Check if logged-in user owns the job
    if (job.client.toString() !== clientId) {
      return res.status(403).json({ message: 'You can only reject proposals for your own jobs.' });
    }

    // Check proposal status
    if (proposal.status === 'accepted') {
      return res.status(400).json({ message: 'Cannot reject an already accepted proposal.' });
    }

    if (proposal.status === 'rejected') {
      return res.status(400).json({ message: 'Proposal is already rejected.' });
    }

    console.log('✅ Rejecting proposal:', proposalId);

    // Set proposal as rejected
    proposal.status = 'rejected';
    proposal.rejectionReason = rejectionReason || 'No reason provided';
    proposal.respondedAt = new Date();
    await proposal.save();

    // 🔥 SEND NOTIFICATION
    try {
      const Notification = require('../Models/notification');
      const { getIO } = require('../services/socketService');

      await Notification.create({
        user: proposal.freelancer_id,
        type: 'proposal_rejected',
        content: `Your proposal for "${job.title}" was not selected by the client`,
        linkUrl: `/jobs/${job._id}`,
        category: 'proposal',
        relatedJob: job._id,
        relatedProposal: proposal._id
      });

      const io = getIO();
      if (io) {
        io.to(`user:${proposal.freelancer_id}`).emit('proposal_rejected', {
          jobId: job._id,
          jobTitle: job.title,
          proposalId: proposal._id
        });
      }

      console.log('✅ Proposal rejection notification sent');
    } catch (notifError) {
      console.error('⚠️ Failed to send notification:', notifError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Proposal rejected successfully.',
      rejectedProposal: proposal
    });
  } catch (err) {
    console.error('❌ Error in rejectProposal:', err);
    res.status(500).json({ message: 'Server error. Could not reject proposal.', error: err.message });
  }
};

// Admin: Create proposal with job_id/freelancer_id format
const createProposalAdmin = async (req, res) => {
  try {
    const { job_id, freelancer_id, coverLetter, message, bidAmount, deliveryTime, status } = req.body;

    // Use authenticated user as freelancer if not provided
    const actualFreelancerId = freelancer_id || req.user.id;

    // Check job existence
    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });

    // Prevent duplicate proposals
    const existingProposal = await Proposal.findOne({ job_id, freelancer_id: actualFreelancerId });
    if (existingProposal) {
      return res.status(400).json({ message: 'A proposal already exists for this job and freelancer.' });
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          url: `/public/uploads/attachments/${file.filename}`,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size
        });
      });
    }

    // Create proposal
    const proposal = await Proposal.create({
      job_id,
      freelancer_id: actualFreelancerId,
      coverLetter,
      message: message || '',
      bidAmount,
      deliveryTime,
      status: status || 'submitted',
      attachments
    });

    // Increment job proposals count
    await Job.findByIdAndUpdate(job_id, { $inc: { proposalsCount: 1 } });

    // Populate proposal data
    await proposal.populate([
      { path: 'job_id', select: 'title description budget' },
      { path: 'freelancer_id', select: 'first_name last_name email profile_picture' }
    ]);

    console.log('✅ Admin: Proposal created successfully:', proposal._id);

    res.status(201).json({
      message: 'Proposal created successfully',
      data: proposal
    });
  } catch (error) {
    console.error('❌ Error creating proposal (admin):', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single proposal by ID
const getProposalById = async (req, res) => {
  try {
    const proposalId = req.params.id;
    const userId = req.user.id;

    const proposal = await Proposal.findById(proposalId)
      .populate('freelancer_id', 'first_name last_name email profile_picture profile_picture_url')
      .populate({
        path: 'job_id',
        select: 'title description budget duration location posted_at required_skills status client',
        populate: {
          path: 'client',
          select: 'first_name last_name email'
        }
      });

    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found.' });
    }

    // Check authorization - only client or freelancer can view
    const job = await Job.findById(proposal.job_id);
    const isClient = job.client?.toString() === userId || job.user_id?.toString() === userId;
    const isFreelancer = proposal.freelancer_id?._id?.toString() === userId;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: 'Access denied. You can only view your own proposals.' });
    }

    res.status(200).json({ proposal });
  } catch (err) {
    console.error('❌ Error in getProposalById:', err);
    res.status(500).json({ message: 'Server error. Could not fetch proposal.', error: err.message });
  }
};

module.exports = {
  createProposal,
  createProposalAdmin,
  editProposal,
  getMyProposals,
  getProposalById,
  hireProposal,
  rejectProposal,
  deleteProposal,
  getAllProposals,
  getProposalsByJob,
  withdrawProposal,
  markProposalAsViewed
};
