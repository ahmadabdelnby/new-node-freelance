const Review = require("../Models/review.model");
const Notification = require("../Models/notification");
const User = require("../Models/User");
const { sendEmail, emailTemplates } = require("../services/emailService");

// Create a new review
const createReview = async (req, res) => {
  try {
    const { contract, reviewer, reviewee, rating, comment } = req.body;

    console.log('📝 Creating review with data:', { contract, reviewer, reviewee, rating, comment: comment?.substring(0, 50) });

    // Validate required fields
    if (!contract || !reviewer || !reviewee || !rating || !comment) {
      const missing = [];
      if (!contract) missing.push('contract');
      if (!reviewer) missing.push('reviewer');
      if (!reviewee) missing.push('reviewee');
      if (!rating) missing.push('rating');
      if (!comment) missing.push('comment');

      return res.status(400).json({
        message: `Missing required fields: ${missing.join(', ')}`,
        missingFields: missing
      });
    }

    // Verify reviewer is authenticated user
    if (String(reviewer) !== String(req.user?._id || req.user?.id)) {
      return res.status(403).json({
        message: "You can only create reviews as yourself"
      });
    }

    // Fetch contract to validate
    const Contract = require("../Models/Contract");
    const contractDoc = await Contract.findById(contract).populate('client freelancer');

    if (!contractDoc) {
      return res.status(404).json({ message: "Contract not found" });
    }

    // Verify contract is completed
    if (contractDoc.status !== 'completed') {
      return res.status(400).json({
        message: "You can only review completed contracts"
      });
    }

    // Verify reviewer is part of the contract
    const isClient = String(contractDoc.client._id) === String(reviewer);
    const isFreelancer = String(contractDoc.freelancer._id) === String(reviewer);

    if (!isClient && !isFreelancer) {
      return res.status(403).json({
        message: "You are not authorized to review this contract"
      });
    }

    // Verify reviewee is the other party
    const expectedReviewee = isClient ? contractDoc.freelancer._id : contractDoc.client._id;
    if (String(reviewee) !== String(expectedReviewee)) {
      return res.status(400).json({
        message: "Invalid reviewee for this contract"
      });
    }

    // Check if review already exists for this contract and reviewer
    const existingReview = await Review.findOne({ contract, reviewer });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this contract" });
    }

    const newReview = new Review({
      contract,
      reviewer,
      reviewee,
      rating,
      comment,
    });

    await newReview.save();

    // Update reviewee's average rating and total reviews
    const allReviewsForUser = await Review.find({ reviewee });
    const totalReviewsCount = allReviewsForUser.length;
    const averageRating = allReviewsForUser.reduce((sum, review) => sum + review.rating, 0) / totalReviewsCount;

    await User.updateOne(
      { _id: reviewee },
      {
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalReviews: totalReviewsCount
      }
    );

    console.log(`⭐ Updated reviewee stats: ${averageRating.toFixed(2)} stars (${totalReviewsCount} reviews)`);

    // Populate review data for notification
    await newReview.populate([
      { path: 'reviewer', select: 'first_name last_name email' },
      { path: 'reviewee', select: 'first_name last_name email' },
      { path: 'contract', select: 'title' }
    ]);

    // Create notification for reviewee
    await Notification.create({
      user: reviewee,
      type: 'review_received',
      content: `${newReview.reviewer.first_name} ${newReview.reviewer.last_name} left you a ${rating}-star review`,
      linkUrl: `/freelancer/${reviewee}`
    });

    // Send Socket.io notification
    const { getIO } = require('../services/socketService');
    const io = getIO();
    if (io) {
      // Send specific review_received event
      io.to(`user:${reviewee}`).emit('review_received', {
        reviewerId: newReview.reviewer._id,
        reviewerName: `${newReview.reviewer.first_name} ${newReview.reviewer.last_name}`,
        rating: rating
      });

      // Send generic notification event to refresh list
      io.to(`user:${reviewee}`).emit('notification', {
        type: 'review_received',
        reviewerId: newReview.reviewer._id,
        rating: rating
      });
    }

    // Send email notification
    const template = emailTemplates.reviewReceived(
      `${newReview.reviewee.first_name} ${newReview.reviewee.last_name}`,
      `${newReview.reviewer.first_name} ${newReview.reviewer.last_name}`,
      rating,
      comment,
      newReview.contract?.title || 'Your Project',
      `${process.env.CLIENT_URL || 'http://localhost:5173'}/freelancer/${reviewee}`
    );

    await sendEmail({
      to: newReview.reviewee.email,
      subject: template.subject,
      html: template.html
    });

    res
      .status(201)
      .json({ message: "Review created successfully", review: newReview });
  } catch (error) {
    console.error("Error creating review:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all reviews
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("reviewer", "username email first_name last_name profile_picture_url")
      .populate("reviewee", "username email first_name last_name profile_picture_url")
      .populate("contract");
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get review by ID
const getReviewById = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const review = await Review.findById(reviewId)
      .populate("reviewer", "username email first_name last_name profile_picture_url")
      .populate("reviewee", "username email first_name last_name profile_picture_url")
      .populate("contract");
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.json(review);
  } catch (error) {
    console.error("Error fetching review:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get reviews by reviewer ID
const getReviewsByReviewer = async (req, res) => {
  try {
    const reviewerId = req.params.reviewerId;
    const reviews = await Review.find({ reviewer: reviewerId })
      .populate("reviewee", "username email first_name last_name profile_picture_url")
      .populate("contract");
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews by reviewer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get reviews by reviewee ID (reviews received by a user)
const getReviewsByReviewee = async (req, res) => {
  try {
    const revieweeId = req.params.revieweeId;
    const reviews = await Review.find({ reviewee: revieweeId })
      .populate("reviewer", "username email first_name last_name profile_picture_url")
      .populate("contract");
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews by reviewee:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get reviews by contract ID
const getReviewsByContract = async (req, res) => {
  try {
    const contractId = req.params.contractId;
    const reviews = await Review.find({ contract: contractId })
      .populate("reviewer", "username email first_name last_name profile_picture_url")
      .populate("reviewee", "username email first_name last_name profile_picture_url");
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews by contract:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update review by ID
const updateReviewById = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const updatedData = req.body;

    // Prevent updating contract, reviewer, and reviewee
    delete updatedData.contract;
    delete updatedData.reviewer;
    delete updatedData.reviewee;

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      updatedData,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedReview) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.json({ message: "Review updated successfully", review: updatedReview });
  } catch (error) {
    console.error("Error updating review:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete review by ID
const deleteReviewById = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const deletedReview = await Review.findByIdAndDelete(reviewId);
    if (!deletedReview) {
      return res.status(404).json({ message: "Review not found" });
    }
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add freelancer reply to a review
const addFreelancerReply = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { content } = req.body;
    const userId = req.user?._id || req.user?.id;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Reply content is required" });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: "Reply cannot exceed 500 characters" });
    }

    // Find the review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Verify that the current user is the reviewee (the freelancer who received the review)
    if (String(review.reviewee) !== String(userId)) {
      return res.status(403).json({
        message: "Only the person who received this review can reply to it"
      });
    }

    // Check if reply already exists
    if (review.freelancerReply?.content) {
      return res.status(400).json({
        message: "You have already replied to this review. You can edit your existing reply."
      });
    }

    // Add the reply
    review.freelancerReply = {
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await review.save();

    // Populate and return the updated review
    const updatedReview = await Review.findById(reviewId)
      .populate("reviewer", "username email first_name last_name profile_picture_url")
      .populate("reviewee", "username email first_name last_name profile_picture_url")
      .populate("contract");

    console.log(`💬 Freelancer reply added to review ${reviewId}`);

    res.json({
      message: "Reply added successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error adding freelancer reply:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update freelancer reply
const updateFreelancerReply = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { content } = req.body;
    const userId = req.user?._id || req.user?.id;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Reply content is required" });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: "Reply cannot exceed 500 characters" });
    }

    // Find the review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Verify that the current user is the reviewee
    if (String(review.reviewee) !== String(userId)) {
      return res.status(403).json({
        message: "Only the person who received this review can edit the reply"
      });
    }

    // Check if reply exists
    if (!review.freelancerReply?.content) {
      return res.status(400).json({ message: "No reply exists to update" });
    }

    // Update the reply
    review.freelancerReply.content = content.trim();
    review.freelancerReply.updatedAt = new Date();

    await review.save();

    // Populate and return the updated review
    const updatedReview = await Review.findById(reviewId)
      .populate("reviewer", "username email first_name last_name profile_picture_url")
      .populate("reviewee", "username email first_name last_name profile_picture_url")
      .populate("contract");

    console.log(`✏️ Freelancer reply updated for review ${reviewId}`);

    res.json({
      message: "Reply updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error updating freelancer reply:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete freelancer reply
const deleteFreelancerReply = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user?._id || req.user?.id;

    // Find the review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Verify that the current user is the reviewee
    if (String(review.reviewee) !== String(userId)) {
      return res.status(403).json({
        message: "Only the person who received this review can delete the reply"
      });
    }

    // Check if reply exists
    if (!review.freelancerReply?.content) {
      return res.status(400).json({ message: "No reply exists to delete" });
    }

    // Delete the reply
    review.freelancerReply = undefined;
    await review.save();

    console.log(`🗑️ Freelancer reply deleted for review ${reviewId}`);

    res.json({ message: "Reply deleted successfully" });
  } catch (error) {
    console.error("Error deleting freelancer reply:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createReview,
  getAllReviews,
  getReviewById,
  getReviewsByReviewer,
  getReviewsByReviewee,
  getReviewsByContract,
  updateReviewById,
  deleteReviewById,
  addFreelancerReply,
  updateFreelancerReply,
  deleteFreelancerReply,
};
