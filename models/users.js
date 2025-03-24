const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // Import UUID generator

const userSchema = new mongoose.Schema({
    user_id: { type: String, default: uuidv4, unique: true }, // Store UUID as a String
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
    updated_at: { type: Date, default: Date.now },
    totp_secret: { type: String }, // Store TOTP secret
});

module.exports = mongoose.model("User", userSchema);