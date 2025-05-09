// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema({
//     message_id: { type: mongoose.Schema.Types.UUID, default: () => crypto.randomUUID(), unique: true },
//     sender_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
//     receiver_id: { type: mongoose.Schema.Types.UUID, refPath: "receiverType", required: true },
//     receiverType: { type: String, enum: ["User", "Group"], required: true },
//     message_content: { type: String, required: true },
//     attachment_url: { type: String },
//     is_ephemeral: { type: Boolean, default: false },
//     created_at: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("Message", messageSchema);
// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema({
//     sender_id: { type: String, ref: "User", required: true },   // Note type: String
//     receiver_id: { type: String, refPath: "receiverType", required: true },
//     receiverType: { type: String, enum: ["User", "Group"], required: true },
//     message_content: { type: String, required: true },
//     attachment_url: { type: String },
//     is_ephemeral: { type: Boolean, default: false },
//     created_at: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("Message", messageSchema);

const mongoose = require("mongoose");

// const MessageSchema = new mongoose.Schema({
//   sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   recipient: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   encryptedMessage: { type: Buffer, required: true },
//   iv: { type: Buffer, required: true },
//   timestamp: { type: Date, default: Date.now },
// });

// Message schema
const MessageSchema = new mongoose.Schema({
    sender: String,
    recipient: String,
    encryptedMessage: [Number],
    iv: [Number],
    timestamp: { type: Date, default: Date.now },
  });

module.exports = mongoose.model("Message", MessageSchema);