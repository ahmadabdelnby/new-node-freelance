const JobInvitation = require('../Models/JobInvitation');
const Job = require('../Models/Jobs');
const User = require('../Models/User');
const Notification = require('../Models/notification');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { getIO, emitToUser } = require('../services/socketService');

// Get client's open jobs (for invitation modal)
const getMyOpenJobs = async (req, res) => {
    try {
        const clientId = req.user.id;
        const { freelancerId } = req.query;

        const openJobs = await Job.find({
            client: clientId,
            status: 'open'
        })
            .select('_id title budget status createdAt')
            .sort({ createdAt: -1 });

        // If freelancerId is provided, get already invited jobs
        let alreadyInvitedJobIds = [];
        if (freelancerId) {
            const existingInvitations = await JobInvitation.find({
                client: clientId,
                freelancer: freelancerId
            }).select('job');
            alreadyInvitedJobIds = existingInvitations.map(inv => inv.job.toString());
        }

        // Add alreadyInvited flag to each job
        const jobsWithInviteStatus = openJobs.map(job => ({
            ...job.toObject(),
            alreadyInvited: alreadyInvitedJobIds.includes(job._id.toString())
        }));

        res.status(200).json({
            success: true,
            jobs: jobsWithInviteStatus
        });
    } catch (error) {
        console.error('Get open jobs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Send job invitation to a freelancer
const sendInvitation = async (req, res) => {
    try {
        const clientId = req.user.id;
        const { freelancerId, jobIds, message } = req.body;

        console.log('📩 Send invitation request:', { clientId, freelancerId, jobIds });

        // Validate input
        if (!freelancerId) {
            console.log('❌ Missing freelancerId');
            return res.status(400).json({
                success: false,
                message: 'Freelancer ID is required'
            });
        }

        if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
            console.log('❌ Invalid jobIds:', jobIds);
            return res.status(400).json({
                success: false,
                message: 'At least one job must be selected'
            });
        }

        // Verify user exists (the one being invited)
        const invitedUser = await User.findById(freelancerId);
        if (!invitedUser) {
            console.log('❌ User not found:', freelancerId);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get sender info
        const sender = await User.findById(clientId);

        // Verify all jobs belong to the sender and are open
        const jobs = await Job.find({
            _id: { $in: jobIds },
            client: clientId,
            status: 'open'
        });

        console.log('📋 Found jobs:', jobs.length, 'of', jobIds.length);

        if (jobs.length !== jobIds.length) {
            console.log('❌ Jobs mismatch - requested:', jobIds, 'found:', jobs.map(j => j._id));
            return res.status(400).json({
                success: false,
                message: 'Some jobs are not found or not available'
            });
        }

        // Create invitations for each job
        const createdInvitations = [];
        const skippedJobs = [];

        for (const job of jobs) {
            try {
                const invitation = await JobInvitation.create({
                    client: clientId,
                    freelancer: freelancerId,
                    job: job._id,
                    message: message || ''
                });
                createdInvitations.push({
                    invitation,
                    job
                });
            } catch (err) {
                // Duplicate invitation - skip
                if (err.code === 11000) {
                    skippedJobs.push(job.title);
                } else {
                    throw err;
                }
            }
        }

        if (createdInvitations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already invited this freelancer to all selected jobs'
            });
        }

        // Create notifications for each invitation
        const jobTitles = createdInvitations.map(inv => inv.job.title);
        const jobTitlesText = jobTitles.length > 1
            ? `${jobTitles.slice(0, -1).join(', ')} and ${jobTitles[jobTitles.length - 1]}`
            : jobTitles[0];

        // Create a single notification for all invitations
        const notification = await Notification.create({
            user: freelancerId,
            type: 'job_invitation',
            content: `${sender.first_name} ${sender.last_name} invited you to submit a proposal for: ${jobTitlesText}`,
            linkUrl: `/jobs/${createdInvitations[0].job._id}`,
            category: 'job',
            relatedUser: clientId
        });

        // Send real-time notification via Socket.IO
        try {
            const io = getIO();
            if (io) {
                io.to(`user:${freelancerId}`).emit('notification', {
                    ...notification.toObject(),
                    relatedUser: {
                        _id: sender._id,
                        first_name: sender.first_name,
                        last_name: sender.last_name,
                        profile_picture: sender.profile_picture
                    }
                });
            }
        } catch (socketError) {
            console.error('Socket notification error:', socketError);
        }

        // Send email notification
        try {
            const jobListHtml = createdInvitations.map(inv =>
                `<li style="margin: 10px 0;"><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs/${inv.job._id}" style="color: #14a800; font-weight: 500;">${inv.job.title}</a></li>`
            ).join('');

            const firstJobId = createdInvitations[0].job._id;

            await sendEmail({
                to: invitedUser.email,
                subject: `🎯 You've Been Invited to Submit a Proposal!`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                        <div style="background: linear-gradient(135deg, #14a800 0%, #0d7a00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                            <h1 style="margin: 0;">🎯 You've Been Invited!</h1>
                        </div>
                        <div style="padding: 30px; background: white; margin-top: 20px; border-radius: 10px;">
                            <h2 style="color: #001e00;">Hi ${invitedUser.first_name},</h2>
                            <p style="color: #5e6d55; font-size: 16px;"><strong style="color: #001e00;">${sender.first_name} ${sender.last_name}</strong> thinks you'd be a great fit for their project${createdInvitations.length > 1 ? 's' : ''} and has invited you to submit a proposal!</p>
                            
                            <div style="background: #f0fdf0; border-left: 4px solid #14a800; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                                <p style="margin: 0 0 10px 0; font-weight: 600; color: #001e00;">📋 Project${createdInvitations.length > 1 ? 's' : ''} you're invited to:</p>
                                <ul style="margin: 0; padding-left: 20px;">
                                    ${jobListHtml}
                                </ul>
                            </div>
                            
                            <div style="background: #fff8e6; border-left: 4px solid #f0b429; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                <p style="margin: 0; color: #5e6d55;"><strong style="color: #001e00;">💡 Tip:</strong> Respond quickly to invitations - clients appreciate prompt communication!</p>
                            </div>
                            
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs/${firstJobId}" style="display: inline-block; padding: 14px 35px; background: #14a800; color: white; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px;">View Job & Submit Proposal</a>
                            </div>
                            
                            <p style="margin-top: 30px; color: #5e6d55;">Best of luck!<br><strong style="color: #001e00;">The Herfa Team</strong></p>
                        </div>
                        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                            <p>© ${new Date().getFullYear()} Herfa Platform. All rights reserved.</p>
                        </div>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
            // Don't fail the request if email fails
        }

        res.status(201).json({
            success: true,
            message: `Invitation${createdInvitations.length > 1 ? 's' : ''} sent successfully!`,
            invitationsCount: createdInvitations.length,
            skippedJobs: skippedJobs.length > 0 ? skippedJobs : undefined
        });
    } catch (error) {
        console.error('Send invitation error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Get invitations received by freelancer
const getMyInvitations = async (req, res) => {
    try {
        const freelancerId = req.user.id;
        const { status } = req.query;

        const query = { freelancer: freelancerId };
        if (status) {
            query.status = status;
        }

        const invitations = await JobInvitation.find(query)
            .populate('client', 'first_name last_name profile_picture')
            .populate('job', 'title budget status')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            invitations
        });
    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// Update invitation status (mark as viewed, accepted, or declined)
const updateInvitationStatus = async (req, res) => {
    try {
        const { invitationId } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        if (!['viewed', 'accepted', 'declined'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const invitation = await JobInvitation.findById(invitationId);
        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found'
            });
        }

        // Only freelancer can update invitation status
        if (invitation.freelancer.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        invitation.status = status;
        await invitation.save();

        res.status(200).json({
            success: true,
            message: `Invitation ${status}`,
            invitation
        });
    } catch (error) {
        console.error('Update invitation status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    getMyOpenJobs,
    sendInvitation,
    getMyInvitations,
    updateInvitationStatus
};
