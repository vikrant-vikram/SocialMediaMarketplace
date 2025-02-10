const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
    media_id: { type: Number, unique: true },
    uploaded_user_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    file_size: { type: Number },
    file_type: { type: String, enum: ["Audio", "Image", "Video", "Document"], required: true },
    file_url: { type: String, required: true },
    is_encrypted: { type: Boolean, default: false },
    entity_id: { type: Number },
    created_at: { type: Date, default: Date.now },
    expired_at: { type: Date },
    status: { type: String, enum: ["Active", "Expired", "Deleted"], default: "Active" }
});

module.exports = mongoose.model("Media", mediaSchema);