const mongoose = require('mongoose');
const Job = require('./Models/Jobs');
const Contract = require('./Models/Contract');

mongoose.connect('mongodb://localhost:27017/freelance').then(async () => {
    try {
        const clientId = '694cdd7f80327fbc0c484635';

        console.log('=== JOBS ===');
        const jobs = await Job.find({ client: clientId })
            .select('_id title status')
            .lean();

        jobs.forEach(job => {
            console.log(`Job: ${job.title}`);
            console.log(`  ID: ${job._id}`);
            console.log(`  Status: ${job.status}`);
            console.log('---');
        });

        console.log('\n=== CONTRACTS ===');
        const contracts = await Contract.find({ client: clientId })
            .select('_id job status')
            .populate('job', 'title')
            .lean();

        contracts.forEach(contract => {
            console.log(`Contract for: ${contract.job?.title || 'N/A'}`);
            console.log(`  ID: ${contract._id}`);
            console.log(`  Status: ${contract.status}`);
            console.log('---');
        });

        console.log('\n=== SUMMARY ===');
        console.log(`Total Jobs: ${jobs.length}`);
        console.log(`Open Jobs: ${jobs.filter(j => j.status === 'open').length}`);
        console.log(`In Progress Jobs: ${jobs.filter(j => j.status === 'in_progress').length}`);
        console.log(`Completed Jobs: ${jobs.filter(j => j.status === 'completed').length}`);
        console.log(`Total Contracts: ${contracts.length}`);
        console.log(`Active Contracts: ${contracts.filter(c => c.status === 'active').length}`);
        console.log(`Completed Contracts: ${contracts.filter(c => c.status === 'completed').length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
});
