const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP
let transporter = null;

const initializeTransporter = async () => {
    try {
        // Use environment variables for SMTP configuration
        if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            // Production: Use real SMTP (Gmail)
            transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT) || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            console.log('✅ Email transporter initialized with Gmail SMTP:', process.env.EMAIL_USER);
        } else {
            // Development: Fallback to Ethereal test account
            const testAccount = await nodemailer.createTestAccount();
            
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            console.log('⚠️ Email transporter initialized with test account:', testAccount.user);
            console.log('Preview emails at: https://ethereal.email');
        }
    } catch (error) {
        console.error('❌ Failed to initialize email transporter:', error);
    }
};

// Send email
const sendEmail = async ({ to, subject, text, html }) => {
    try {
        if (!transporter) {
            await initializeTransporter();
        }

        const info = await transporter.sendMail({
            from: `"Herfa Platform" <${process.env.EMAIL_USER || 'noreply@herfa.com'}>`,
            to,
            subject,
            text,
            html
        });

        console.log('📧 Email sent successfully to:', to);
        console.log('Message ID:', info.messageId);
        
        // Show preview URL only for Ethereal test emails
        if (info.messageId.includes('ethereal.email')) {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };
    } catch (error) {
        console.error('❌ Send email error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Email templates
const emailTemplates = {
    welcome: (userName) => ({
        subject: 'Welcome to Herfa Platform!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #001e00;">Welcome to Herfa, ${userName}! 🎉</h2>
                <p>Thank you for joining our freelancing platform.</p>
                <p>You can now:</p>
                <ul>
                    <li>Post jobs or apply to available projects</li>
                    <li>Connect with talented freelancers or clients</li>
                    <li>Build your portfolio</li>
                    <li>Start earning!</li>
                </ul>
                <p>Best regards,<br>The Herfa Team</p>
            </div>
        `
    }),

    jobPosted: (clientName, jobTitle) => ({
        subject: 'Your Job Has Been Posted Successfully!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #001e00;">Job Posted Successfully! 🚀</h2>
                <p>Hi ${clientName},</p>
                <p>Your job "<strong>${jobTitle}</strong>" has been posted successfully.</p>
                <p>Freelancers will start submitting proposals soon. We'll notify you when you receive new proposals.</p>
                <p>Best regards,<br>The Herfa Team</p>
            </div>
        `
    }),

    proposalReceived: (clientName, freelancerName, jobTitle) => ({
        subject: 'New Proposal Received!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #001e00;">New Proposal Received! 📩</h2>
                <p>Hi ${clientName},</p>
                <p><strong>${freelancerName}</strong> has submitted a proposal for your job "<strong>${jobTitle}</strong>".</p>
                <p>Login to your dashboard to review the proposal and connect with the freelancer.</p>
                <p>Best regards,<br>The Herfa Team</p>
            </div>
        `
    }),

    proposalAccepted: (freelancerName, jobTitle) => ({
        subject: 'Congratulations! Your Proposal Was Accepted! 🎊',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #001e00;">Proposal Accepted! 🎊</h2>
                <p>Hi ${freelancerName},</p>
                <p>Great news! Your proposal for "<strong>${jobTitle}</strong>" has been accepted.</p>
                <p>A contract has been created. Login to your dashboard to view details and start working.</p>
                <p>Best regards,<br>The Herfa Team</p>
            </div>
        `
    }),

    contractCreated: (userName, jobTitle) => ({
        subject: 'New Contract Created',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #001e00;">Contract Created! 📝</h2>
                <p>Hi ${userName},</p>
                <p>A new contract has been created for "<strong>${jobTitle}</strong>".</p>
                <p>Login to your dashboard to view the contract details.</p>
                <p>Best regards,<br>The Herfa Team</p>
            </div>
        `
    }),

    paymentReceived: (userName, amount) => ({
        subject: 'Payment Received!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #001e00;">Payment Received! 💰</h2>
                <p>Hi ${userName},</p>
                <p>You have received a payment of <strong>$${amount}</strong>.</p>
                <p>Login to your dashboard to view payment details.</p>
                <p>Best regards,<br>The Herfa Team</p>
            </div>
        `
    }),

    messageReceived: (userName, senderName) => ({
        subject: 'New Message Received',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #001e00;">New Message! 💬</h2>
                <p>Hi ${userName},</p>
                <p><strong>${senderName}</strong> sent you a message.</p>
                <p>Login to your dashboard to read and reply.</p>
                <p>Best regards,<br>The Herfa Team</p>
            </div>
        `
    }),

    welcomeEmail: (userName, userRole) => ({
        subject: 'Welcome to Freelance Platform! 🎉',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                    <h1>Welcome to Freelance Platform!</h1>
                </div>
                <div style="padding: 30px; background: white; margin-top: 20px; border-radius: 10px;">
                    <h2>Hi ${userName},</h2>
                    <p>Thank you for joining our freelance platform! We're excited to have you on board.</p>
                    <p>Your account has been successfully created as a <strong>${userRole}</strong>.</p>
                    <p>Here's what you can do next:</p>
                    <ul>
                        ${userRole === 'freelancer' 
                            ? '<li>Complete your profile and showcase your skills</li><li>Browse available jobs and submit proposals</li><li>Build your portfolio</li>' 
                            : '<li>Post your first job</li><li>Browse talented freelancers</li><li>Manage your projects</li>'}
                    </ul>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Get Started</a>
                    </div>
                    <p style="margin-top: 30px;">Best regards,<br>The Freelance Platform Team</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>© 2025 Freelance Platform. All rights reserved.</p>
                    <p>If you didn't create this account, please ignore this email.</p>
                </div>
            </div>
        `
    }),

    passwordReset: (userName, resetToken) => ({
        subject: 'Password Reset Request 🔐',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                <div style="background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px;">
                    <h1>Password Reset Request</h1>
                </div>
                <div style="padding: 30px; background: white; margin-top: 20px; border-radius: 10px;">
                    <h2>Hi ${userName},</h2>
                    <p>You recently requested to reset your password for your Freelance Platform account.</p>
                    <p>Click the button below to reset it:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}" style="display: inline-block; padding: 12px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    </div>
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
                        <p style="margin: 5px 0 0 0;">This link will expire in 1 hour for security reasons.</p>
                        <p style="margin: 5px 0 0 0;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                    </div>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                        Or copy and paste this URL into your browser:<br>
                        <span style="color: #667eea;">${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}</span>
                    </p>
                    <p style="margin-top: 30px;">Best regards,<br>The Freelance Platform Team</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>© 2025 Freelance Platform. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    jobInvitation: (freelancerName, jobTitle, clientName, jobId) => ({
        subject: `New Job Invitation: ${jobTitle} 💼`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                    <h1>You've Been Invited! 🎉</h1>
                </div>
                <div style="padding: 30px; background: white; margin-top: 20px; border-radius: 10px;">
                    <h2>Hi ${freelancerName},</h2>
                    <p><strong>${clientName}</strong> thinks you'd be a great fit for their project!</p>
                    <div style="background: #f9f9f9; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                        <h3 style="margin-top: 0;">${jobTitle}</h3>
                        <p>Click below to view the full job details and submit your proposal.</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobId}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">View Job & Submit Proposal</a>
                    </div>
                    <p style="margin-top: 30px;">Best regards,<br>The Freelance Platform Team</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>© 2025 Freelance Platform. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    proposalAccepted: (freelancerName, jobTitle, amount, contractId) => ({
        subject: `🎊 Congratulations! Your Proposal Was Accepted`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                    <h1>🎊 Proposal Accepted!</h1>
                </div>
                <div style="padding: 30px; background: white; margin-top: 20px; border-radius: 10px;">
                    <h2>Congratulations ${freelancerName}!</h2>
                    <p>Your proposal for "<strong>${jobTitle}</strong>" has been accepted by the client!</p>
                    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>📋 Contract Details:</strong></p>
                        <p style="margin: 10px 0 0 0;">Project Budget: <strong>$${amount}</strong></p>
                        <p style="margin: 5px 0 0 0;">Status: <strong>Active</strong></p>
                    </div>
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>💰 Payment Information:</strong></p>
                        <p style="margin: 5px 0 0 0;">The client's payment of $${amount} has been secured in escrow and will be released upon successful completion of the project.</p>
                    </div>
                    <p>Next steps:</p>
                    <ul>
                        <li>View your contract details</li>
                        <li>Start working on the project</li>
                        <li>Communicate with the client</li>
                        <li>Submit deliverables when ready</li>
                    </ul>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts/${contractId}" style="display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">View Contract</a>
                    </div>
                    <p style="margin-top: 30px;">Best of luck with your project!<br>The Freelance Platform Team</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>© 2025 Freelance Platform. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    contractCreated: (clientName, jobTitle, freelancerName, contractId) => ({
        subject: `✅ Contract Created: ${jobTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                    <h1>✅ Contract Created</h1>
                </div>
                <div style="padding: 30px; background: white; margin-top: 20px; border-radius: 10px;">
                    <h2>Hi ${clientName},</h2>
                    <p>Your contract for "<strong>${jobTitle}</strong>" has been successfully created with <strong>${freelancerName}</strong>.</p>
                    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>✓ Payment Secured</strong></p>
                        <p style="margin: 5px 0 0 0;">Your payment has been placed in escrow and will be released to the freelancer upon project completion.</p>
                    </div>
                    <p>The freelancer can now start working on your project. You'll receive updates throughout the process.</p>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts/${contractId}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">View Contract</a>
                    </div>
                    <p style="margin-top: 30px;">Best regards,<br>The Freelance Platform Team</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>© 2025 Freelance Platform. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    paymentReleased: (freelancerName, jobTitle, amount, contractId) => ({
        subject: `💰 Payment Released: $${amount}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                    <h1>💰 Payment Released!</h1>
                </div>
                <div style="padding: 30px; background: white; margin-top: 20px; border-radius: 10px;">
                    <h2>Great news, ${freelancerName}!</h2>
                    <p>The client has marked the contract for "<strong>${jobTitle}</strong>" as complete, and your payment has been released!</p>
                    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #155724;">Payment Amount</p>
                        <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: #28a745;">$${amount}</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #155724;">✓ Released from Escrow</p>
                    </div>
                    <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>ℹ️ Next Steps:</strong></p>
                        <p style="margin: 5px 0 0 0;">The payment will be transferred to your account within 1-3 business days.</p>
                        <p style="margin: 5px 0 0 0;">Don't forget to leave a review for the client!</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts/${contractId}" style="display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">View Contract</a>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts/${contractId}/review" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Leave Review</a>
                    </div>
                    <p style="margin-top: 30px;">Congratulations on a successful project!<br>The Freelance Platform Team</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>© 2025 Freelance Platform. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    contractCompleted: (clientName, jobTitle, freelancerName, contractId) => ({
        subject: `✅ Contract Completed: ${jobTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 30px; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                    <h1>✅ Contract Completed</h1>
                </div>
                <div style="padding: 30px; background: white; margin-top: 20px; border-radius: 10px;">
                    <h2>Hi ${clientName},</h2>
                    <p>You have successfully completed the contract for "<strong>${jobTitle}</strong>" with <strong>${freelancerName}</strong>.</p>
                    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>✓ Payment Released</strong></p>
                        <p style="margin: 5px 0 0 0;">The payment has been released from escrow to the freelancer.</p>
                    </div>
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>⭐ Please Leave a Review</strong></p>
                        <p style="margin: 5px 0 0 0;">Your feedback helps other clients find great freelancers!</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contracts/${contractId}/review" style="display: inline-block; padding: 12px 30px; background: #ffc107; color: #000; text-decoration: none; border-radius: 5px;">Leave Review</a>
                    </div>
                    <p style="margin-top: 30px;">Thank you for using our platform!<br>The Freelance Platform Team</p>
                </div>
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                    <p>© 2025 Freelance Platform. All rights reserved.</p>
                </div>
            </div>
        `
    })
};

module.exports = {
    initializeTransporter,
    sendEmail,
    emailTemplates
};
