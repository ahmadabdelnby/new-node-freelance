const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  freelancer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  coverLetter: {
    type: String,
    required: true,
    trim: true,
    minLength: [50, 'Cover letter must be at least 50 characters'],
    maxLength: [2000, 'Cover letter cannot exceed 2000 characters']
  },
  message: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  bidAmount: {
    type: Number,
    required: true,
    min: [0, 'Bid amount must be greater than or equal to 0'],
  },
  deliveryTime: {
    type: Number, // in days
    required: true,
    min: [1, 'Delivery time must be at least 1 day']
  },
  attachments: [
    {
      url: String,
      fileName: String,
      fileType: String,
      fileSize: Number
    },
  ],
  status: {
    type: String,
    enum: ['submitted', 'viewed', 'accepted', 'rejected', 'withdrawn'],
    default: 'submitted',
  },
  withdrawReason: {
    type: String,
    trim: true,
    maxLength: 500
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxLength: 500
  },
  viewedAt: {
    type: Date
  },
  respondedAt: {
    type: Date
  }
},  { timestamps: true });

// Indexes for better performance
proposalSchema.index({ job_id: 1 });
proposalSchema.index({ freelancer_id: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ createdAt: -1 });

// Compound index for preventing duplicate proposals
proposalSchema.index({ job_id: 1, freelancer_id: 1 }, { unique: true });

module.exports = mongoose.model('Proposal', proposalSchema);
