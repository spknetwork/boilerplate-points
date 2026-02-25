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
  communityDescriptionExtra: {
    type: String,
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
