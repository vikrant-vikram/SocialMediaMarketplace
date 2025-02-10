const mongoose = require("mongoose");

const marketplaceListingSchema = new mongoose.Schema({
    listing_id: { type: mongoose.Schema.Types.UUID, default: () => crypto.randomUUID(), unique: true },
    seller_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    item_name: { type: String, required: true },
    item_description: { type: String },
    price: { type: Number, required: true },
    image_url: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MarketplaceListing", marketplaceListingSchema);