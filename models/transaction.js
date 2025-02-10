const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    transaction_id: { type: mongoose.Schema.Types.UUID, default: () => crypto.randomUUID(), unique: true },
    buyer_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    seller_id: { type: mongoose.Schema.Types.UUID, ref: "User", required: true },
    listing_id: { type: mongoose.Schema.Types.UUID, ref: "MarketplaceListing", required: true },
    amount: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", transactionSchema);