const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.UUID, default: () => crypto.randomUUID(), unique: true },
    group_name: { type: String, required: true },
    group_owner_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Group", groupSchema);