const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
    report_id: { type: Number, unique: true },
    reporter_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    reported_user_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    reported_content: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    action_taken: { type: String, enum: ["Pending", "Warning Issued", "Account Suspended"], default: "Pending" }
});

module.exports = mongoose.model("Report", reportSchema);