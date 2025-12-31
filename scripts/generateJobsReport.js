const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Job = require('../Models/Jobs');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing';

async function generateJobsReport() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const now = new Date();
        
        // Get all jobs
        const allJobs = await Job.find().sort({ createdAt: 1 });
        
        // Statistics
        const stats = {
            total: allJobs.length,
            open: allJobs.filter(j => j.status === 'open').length,
            inProgress: allJobs.filter(j => j.status === 'in_progress').length,
            completed: allJobs.filter(j => j.status === 'completed').length,
            cancelled: allJobs.filter(j => j.status === 'cancelled').length,
            withFutureDeadline: allJobs.filter(j => j.deadline > now).length,
            withPastDeadline: allJobs.filter(j => j.deadline < now).length
        };

        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║           📊 تقرير شامل للوظائف                 ║');
        console.log('╚══════════════════════════════════════════════════╝\n');

        console.log('📈 إحصائيات عامة:');
        console.log(`   - إجمالي الوظائف: ${stats.total}`);
        console.log(`   - وظائف مفتوحة: ${stats.open}`);
        console.log(`   - وظائف قيد التنفيذ: ${stats.inProgress}`);
        console.log(`   - وظائف مكتملة: ${stats.completed}`);
        console.log(`   - وظائف ملغاة: ${stats.cancelled}`);
        
        console.log('\n⏰ حسب الـ Deadline:');
        console.log(`   - وظائف بـ deadline مستقبلي: ${stats.withFutureDeadline}`);
        console.log(`   - وظائف بـ deadline منتهي: ${stats.withPastDeadline}`);

        // Check for logical consistency
        const openWithPastDeadline = allJobs.filter(j => 
            j.status === 'open' && j.deadline < now
        );
        
        const inProgressWithPastDeadline = allJobs.filter(j => 
            j.status === 'in_progress' && j.deadline < now
        );

        console.log('\n✅ التحقق من البيانات:');
        console.log(`   - وظائف مفتوحة بـ deadline منتهي: ${openWithPastDeadline.length}`);
        console.log(`   - وظائف قيد التنفيذ بـ deadline منتهي: ${inProgressWithPastDeadline.length}`);

        if (openWithPastDeadline.length === 0 && inProgressWithPastDeadline.length === 0) {
            console.log('   ✅ ممتاز! جميع الوظائف المنتهية أصبحت مكتملة أو ملغاة');
        } else {
            console.log('   ⚠️ يوجد وظائف منتهية لم يتم تحديثها');
        }

        // Sample of completed jobs with past deadlines
        const completedWithPastDeadline = allJobs.filter(j => 
            j.status === 'completed' && j.deadline < now
        ).slice(0, 10);

        if (completedWithPastDeadline.length > 0) {
            console.log('\n📋 أمثلة على الوظائف المكتملة بـ deadline منتهي:');
            completedWithPastDeadline.forEach((job, index) => {
                console.log(`   ${index + 1}. "${job.title}"`);
                console.log(`      - Status: ${job.status}`);
                console.log(`      - Deadline: ${job.deadline.toLocaleDateString()}`);
                console.log(`      - Closed At: ${job.closedAt ? job.closedAt.toLocaleDateString() : 'N/A'}`);
            });
        }

        // Active jobs with future deadlines
        const activeJobs = allJobs.filter(j => 
            (j.status === 'open' || j.status === 'in_progress') && j.deadline > now
        ).slice(0, 5);

        if (activeJobs.length > 0) {
            console.log('\n📌 الوظائف النشطة (بـ deadline مستقبلي):');
            activeJobs.forEach((job, index) => {
                console.log(`   ${index + 1}. "${job.title}"`);
                console.log(`      - Status: ${job.status}`);
                console.log(`      - Deadline: ${job.deadline.toLocaleDateString()}`);
                console.log(`      - Days Remaining: ${Math.ceil((job.deadline - now) / (1000 * 60 * 60 * 24))} days`);
            });
        }

        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║              ✅ التقرير مكتمل                    ║');
        console.log('╚══════════════════════════════════════════════════╝');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error generating report:', error);
        process.exit(1);
    }
}

generateJobsReport();
