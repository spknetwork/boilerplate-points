const mongoose = require("mongoose");

const communityDockerSchema = new mongoose.Schema({
  containerName: {
    type: String,
    required: true,
  },
  platformCreator: {
    type: String,
    required: true,
  },
  aboutPlatform: {
    type: String,
    required: true,
  },
  port: {
    type: String,
  },
  tags: {
    type: String,
  },
  communityId: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
    unique: true,
  },
  dockerStatus: {
    type: String,
    enum: ['pending', 'approved', 'canceled'],
    default: 'pending',
  },
  admins: {
    type: [String],
    default: [],
  },
  communityTitle: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Docker", communityDockerSchema);
