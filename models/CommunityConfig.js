const mongoose = require("mongoose");

const communityConfigSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  communityName: {
    type: String,
    required: true,
  },
  hiveCommunityId: {
    type: String,
    required: true,
  },
  logoUrl: {
    type: String,
  },
  primaryColor: {
    type: String,
    default: "#ff4400",
  },
  onboardingSats: {
    type: Number,
    default: 100,
  },
  communityDescription: {
    type: String,
    default: "A decentralized community powered by Breakaway.",
  },
  nativeTokenTicker: {
    type: String,
    default: "HIVE" // HIVE by default, or SOVRA, etc.
  },
  nativeTokenNetwork: {
    type: String,
    default: "HIVE" // HIVE, BASE, POLYGON, SOL, etc.
  },
  nativeTokenAddress: {
    type: String,
    default: "" // The contract/mint address if it's on an external chain
  },
  communityDescriptionExtra: {
    type: String,
  },
  sslVerificationData: {
    type: Object,
    default: null
  },
  hostnameStatus: {
    type: String,
    default: 'pending'
  },
  isConfigured: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

communityConfigSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("CommunityConfig", communityConfigSchema);
