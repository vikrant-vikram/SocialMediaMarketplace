const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    audit_id: { type: mongoose.Schema.Types.UUID, default: () => crypto.randomUUID(), unique: true },
    user_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    ip_address: { type: String, required: true }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);