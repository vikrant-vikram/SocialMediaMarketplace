const mongoose = require("mongoose");

const adminActionLogSchema = new mongoose.Schema({
    log_id: { type: mongoose.Schema.Types.UUID, default: () => crypto.randomUUID(), unique: true },
    admin_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    action: { type: String, required: true },
    affected_user_id: { type: mongoose.Schema.Types.UUID, ref: "User" },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AdminActionLog", adminActionLogSchema);