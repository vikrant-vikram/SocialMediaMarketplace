const mongoose = require("mongoose");

const groupMemberSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.UUID, ref: "Group", required: true },
    user_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    joined_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("GroupMember", groupMemberSchema);