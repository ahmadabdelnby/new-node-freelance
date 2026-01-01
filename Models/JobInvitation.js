const mongoose = require('mongoose');

const jobInvitationSchema = new mongoose.Schema({
    // The client who sent the invitation
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The freelancer who received the invitation
    freelancer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The job the freelancer is invited to
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    // Optional message from the client
    message: {
        type: String,
        trim: true,
        maxLength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'viewed', 'accepted', 'declined'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate invitations
jobInvitationSchema.index({ client: 1, freelancer: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('JobInvitation', jobInvitationSchema);
