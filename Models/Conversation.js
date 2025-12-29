// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// /**
//  * Per-user conversation state
//  */
// const memberStateSchema = new Schema(
//     {
//         userId: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             required: true,
//         },
//         unreadCount: {
//             type: Number,
//             default: 0,
//             min: 0,
//         },
//         isMuted: {
//             type: Boolean,
//             default: false,
//         },
//         isArchived: {
//             type: Boolean,
//             default: false,
//         },
//         lastReadAt: {
//             type: Date,
//             default: null,
//         },
//     },
//     { _id: false }
// );

// /**
//  * User reports
//  */
// const reportSchema = new Schema(
//     {
//         reportedBy: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             required: true,
//         },
//         reason: {
//             type: String,
//             enum: ['harassment', 'spam', 'abuse', 'other'],
//             required: true,
//         },
//         messageId: {
//             type: Schema.Types.ObjectId,
//             ref: 'Message',
//             default: null,
//         },
//         createdAt: {
//             type: Date,
//             default: Date.now,
//         },
//     },
//     { _id: false }
// );

// /**
//  * Moderation / audit actions
//  */
// const auditActionSchema = new Schema(
//     {
//         action: {
//             type: String,
//             required: true,
//             // e.g. warn_user, mute_user, suspend_user
//         },
//         targetUser: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             default: null,
//         },
//         performedBy: {
//             type: Schema.Types.ObjectId,
//             ref: 'User', // user with role === 'admin' | 'moderator'
//             required: true,
//         },
//         createdAt: {
//             type: Date,
//             default: Date.now,
//         },
//     },
//     { _id: false }
// );
// const conversationSchema = new Schema(
//     {
//         participants: [
//             {
//                 type: Schema.Types.ObjectId,
//                 ref: 'User',
//                 required: true,
//             },
//         ],

//         type: {
//             type: String,
//             enum: ['direct', 'group', 'support', 'system'],
//             default: 'direct',
//         },

//         memberStates: {
//             type: [memberStateSchema],
//             default: [],
//         },

//         lastMessage: {
//             type: Schema.Types.ObjectId,
//             ref: 'Message',
//             default: null,
//         },

//         lastMessageAt: {
//             type: Date,
//             default: null,
//         },

//         moderation: {
//             isFlagged: {
//                 type: Boolean,
//                 default: false,
//             },
//             flagReasons: {
//                 type: [String],
//                 default: [],
//             },
//             flagCount: {
//                 type: Number,
//                 default: 0,
//             },
//             lastFlaggedAt: {
//                 type: Date,
//                 default: null,
//             },
//             reviewStatus: {
//                 type: String,
//                 enum: ['none', 'pending', 'reviewed', 'action_taken'],
//                 default: 'none',
//             },
//         },

//         reports: {
//             type: [reportSchema],
//             default: [],
//         },

//         blockedBy: [
//             {
//                 blocker: {
//                     type: Schema.Types.ObjectId,
//                     ref: 'User',
//                 },
//                 blockedAt: {
//                     type: Date,
//                     default: Date.now,
//                 },
//             },
//         ],

//         isDeleted: {
//             type: Boolean,
//             default: false,
//         },

//         deletedFor: [
//             {
//                 userId: {
//                     type: Schema.Types.ObjectId,
//                     ref: 'User',
//                 },
//                 deletedAt: {
//                     type: Date,
//                     default: Date.now,
//                 },
//             },
//         ],

//         audit: {
//             lastModeratedAt: {
//                 type: Date,
//                 default: null,
//             },
//             lastModeratedBy: {
//                 type: Schema.Types.ObjectId,
//                 ref: 'User', // admin/moderator
//                 default: null,
//             },
//             actions: {
//                 type: [auditActionSchema],
//                 default: [],
//             },
//         },

//         messageCount: {
//             type: Number,
//             default: 0,
//         },

//         active: {
//             type: Boolean,
//             default: true,
//         },
//         // MockConversation
//         hasFlaggedMessages: {
//             type: Boolean,
//             default: false,
//             index: true,
//         },

//     },
//     { timestamps: true }
// );

// conversationSchema.index({ participants: 1 });
// conversationSchema.index({ lastMessageAt: -1 });
// conversationSchema.index({ 'moderation.isFlagged': 1 });

// module.exports =
//     mongoose.models.Conversation ||
//     mongoose.model("Conversation", conversationSchema);