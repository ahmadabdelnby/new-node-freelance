// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const messageSchema = new Schema({
//     conversation: {
//         type: Schema.Types.ObjectId,
//         ref: 'Conversation',
//         required: true
//     },
//     sender: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     content: {
//         type: String,
//         required: true,
//         trim: true,
//         maxLength: 5000
//     },
//     attachments: [{
//         url: String,
//         fileName: String,
//         fileType: String,
//         fileSize: Number
//     }],
//     isRead: {
//         type: Boolean,
//         default: false
//     },
//     readAt: {
//         type: Date
//     },
//     isDelivered: {
//         type: Boolean,
//         default: false
//     },
//     deliveredAt: {
//         type: Date
//     },
//     isEdited: {
//         type: Boolean,
//         default: false
//     },
//     editedAt: {
//         type: Date
//     },
//     isDeleted: {
//         type: Boolean,
//         default: false
//     },
//     deletedAt: {
//         type: Date
//     },
//     // For message reactions (future feature)
//     reactions: [{
//         user: {
//             type: Schema.Types.ObjectId,
//             ref: 'User'
//         },
//         emoji: String
//     }]
// }, {
//     timestamps: true
// });

// // Indexes for better performance
// messageSchema.index({ conversation: 1, createdAt: -1 });
// messageSchema.index({ sender: 1 });
// messageSchema.index({ isRead: 1 });

// const conversationSchema = new Schema({
//     participants: [{
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     }],
//     job: {
//         type: Schema.Types.ObjectId,
//         ref: 'Job'
//     },
//     proposal: {
//         type: Schema.Types.ObjectId,
//         ref: 'Proposal'
//     },
//     lastMessage: {
//         type: Schema.Types.ObjectId,
//         ref: 'Message'
//     },
//     lastMessageAt: {
//         type: Date,
//         default: Date.now
//     },
//     // Track unread count per participant
//     unreadCount: [{
//         user: {
//             type: Schema.Types.ObjectId,
//             ref: 'User'
//         },
//         count: {
//             type: Number,
//             default: 0
//         }
//     }],
//     // Archive conversation
//     isArchived: {
//         type: Boolean,
//         default: false
//     },
//     archivedBy: [{
//         type: Schema.Types.ObjectId,
//         ref: 'User'
//     }],
//     // Mute notifications
//     mutedBy: [{
//         type: Schema.Types.ObjectId,
//         ref: 'User'
//     }]
// }, {
//     timestamps: true
// });

// // Indexes for better performance
// conversationSchema.index({ participants: 1 });
// conversationSchema.index({ lastMessageAt: -1 });
// conversationSchema.index({ job: 1 });
// conversationSchema.index({ proposal: 1 });

// // Validate that conversation has exactly 2 participants
// conversationSchema.pre('save', function (next) {
//     if (this.participants.length !== 2) {
//         return next(new Error('Conversation must have exactly 2 participants'));
//     }
//     next();
// });

// const Message = mongoose.model('Message', messageSchema);
// const Conversation = mongoose.model('Conversation', conversationSchema);

// module.exports = { Message, Conversation };
