const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.UUID, default: () => crypto.randomUUID(), unique: true },
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    email_verified: { type: Boolean, default: false },
    mobile_number: { type: String, unique: true },
    mobile_verified: { type: Boolean, default: false },
    password_hash: { type: String, required: true },
    profile_picture_url: { type: String },
    bio: { type: String },
    is_suspended: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);