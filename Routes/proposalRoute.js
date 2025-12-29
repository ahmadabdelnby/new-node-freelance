const express = require('express');
const router = express.Router();
const {
  createProposal,
  editProposal,
  getMyProposals,
  getProposalById,
  getAllProposals,
  hireProposal,
  rejectProposal,
  deleteProposal,
  getProposalsByJob,
  withdrawProposal,
  markProposalAsViewed
} = require('../Controllers/proposalController');
const authenticate = require('../middleware/authenticationMiddle');
const optionalAuth = require('../middleware/optionalAuth');
const { uploadAttachments } = require('../middleware/uploadMiddleware');
const { validateProposalCreation, validateMongoId } = require('../middleware/validation');
const { proposalLimiter } = require('../middleware/rateLimiter');

// GET /api/proposals - get all proposals (admin)
router.get('/', authenticate, getAllProposals);

// POST /api/proposals - create a new proposal (with file attachments)
router.post('/', authenticate, proposalLimiter, uploadAttachments, validateProposalCreation, createProposal);

// PATCH /api/proposals/id - edit a proposal
router.patch('/:id', authenticate, validateMongoId, editProposal);

// GET /api/proposals/mine - get logged-in freelancer's proposals
router.get('/mine', authenticate, getMyProposals);

// GET /api/proposals/job/:jobId - get all proposals for a job (allow viewing count even when not logged in)
router.get('/job/:jobId', optionalAuth, getProposalsByJob);

// GET /api/proposals/:id - get single proposal by ID
router.get('/:id', authenticate, validateMongoId, getProposalById);

// PATCH /api/proposals/:id/hire - hire a freelancer for a job (client only)
router.patch('/:id/hire', authenticate, hireProposal);

// PATCH /api/proposals/:id/reject - reject a proposal (client only)
router.patch('/:id/reject', authenticate, rejectProposal);

// PATCH /api/proposals/:id/withdraw - withdraw a proposal
router.patch('/:id/withdraw', authenticate, withdrawProposal);

// PATCH /api/proposals/:id/viewed - mark proposal as viewed
router.patch('/:id/viewed', authenticate, markProposalAsViewed);

// DELETE /api/proposals/:id - delete a proposal
router.delete('/:id', authenticate, deleteProposal);

module.exports = router;
