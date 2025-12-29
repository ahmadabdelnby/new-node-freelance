// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const messageSchema = new Schema(
//     {
//         conversationId: {
//             type: Schema.Types.ObjectId,
//             ref: 'Conversation',
//             required: true,
//             index: true,
//         },

//         sender: {
//             type: Schema.Types.ObjectId,
//             ref: 'User',
//             required: true,
//         },

//         type: {
//             type: String,
//             enum: ['text', 'image', 'file', 'system'],
//             default: 'text',
//         },

//         content: {
//             type: String,
//             trim: true,
//             default: null,
//         },

//         attachments: [
//             {
//                 url: String,
//                 fileType: String,
//                 size: Number,
//             },
//         ],

//         /** Safety & moderation */
//         isFlagged: {
//             type: Boolean,
//             default: false,
//             index: true,
//         },

//         // flagReasons: {
//         //     type: [String],
//         //     default: [],
//         // },
//         flaggedBy: [
//             {
//                 userId: { type: Schema.Types.ObjectId, ref: 'User' },
//                 reason: { type: String, required: true },
//                 flaggedAt: { type: Date, default: Date.now },
//             }
//         ],

//         /** Message state */
//         isDeleted: {
//             type: Boolean,
//             default: false,
//         },

//         deletedAt: {
//             type: Date,
//             default: null,
//         },
//     },
//     {
//         timestamps: true,
//     }
// )
// messageSchema.index({ conversationId: 1, createdAt: 1 });
// messageSchema.index({ sender: 1 });
// module.exports =
//   mongoose.models.Message ||
//   mongoose.model("Message", messageSchema);
