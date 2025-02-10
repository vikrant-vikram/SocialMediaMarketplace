const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema({
    relationship_id: { type: Number, unique: true },
    user_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    friend_id_or_follow_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    status: { type: String, enum: ["Pending", "Accepted", "Blocked"], required: true },
    request_sent: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Friendship", friendshipSchema);
