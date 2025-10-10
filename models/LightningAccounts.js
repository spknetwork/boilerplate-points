const mongoose = require("mongoose");

const lightningAccountSchema = new mongoose.Schema({
    username: {
    type: String,
    required: true,
    unique: true, // prevent duplicate Hive usernames
  },
  keys: {
    ownerPubkey: { type: String, required: true },
    activePubkey: { type: String, required: true },
    postingPubkey: { type: String, required: true },
    memoPubkey: { type: String, required: true },
  },
  lightningInvoice: {
    type: String,
    required: true, // LN invoice requested for payment
  },
  v4vMemo: {
    type: String,
    required: true, // Original memo from V4v
  },
  paymentAddress: {
    type: String,
    required: true, // LN transaction/payment address
    unique: true,
  },
  paymentHash: {
    type: String,
    required: true, // LN transaction/payment hash
    unique: true,
  },
  rHash: {
    type: String,
    required: true, // LN rR/payment hash
    unique: true,
  },
  memo: {
    type: String, // 👈 Hive account name as memo for easy matching
  },
  satsAmount: {
    type: Number,
    default: 0, // requested sats from invoice
  },
  satsPaid: {
    type: Number,
    default: 0, // Actual sats paid
  },
  token: {
    type: String,
    enum: ["HIVE", "HBD"],
    default: "HIVE",
  },
  hiveTxId: {
    type: String,
    unique: true,
    sparse: true, // Hive blockchain tx id after swap
  },
  status: {
    type: String,
    enum: ["pending", "paid", "account_created", "failed"],
    default: "pending",
  },
  paidAt: {
    type: Date,
  },
  error: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

lightningAccountSchema.index({ paymentHash: 1 });
lightningAccountSchema.index({ username: 1 });

module.exports = mongoose.model("LightningAccount", lightningAccountSchema);
