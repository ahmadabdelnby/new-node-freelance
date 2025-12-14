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
        const clientContracts = await contract.find({ client: userId });
        //my contracts as a freelancer
        const freelancerContracts = await contract.find({ freelancer: userId });

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
        const foundContract = await contract.findById(id);
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

        Contract.status = 'completed';
        Contract.completedAt = new Date();
        await Contract.save();

        // Update freelancer's completed jobs count
        const User = require('../Models/User');
        await User.findByIdAndUpdate(
            Contract.freelancer,
            { $inc: { completedJobs: 1 } }
        );

        res.status(200).json({
            message: 'Contract completed successfully',
            contract: Contract
        });
    } catch (error) {
        console.error('Error completing contract:', error);
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
module.exports = {
    createContract,
    getMyContracts,
    getContractById,
    updateContractById,
    deleteContractById,
    getAllContracts,
    completeContract,
    updateHoursWorked
};