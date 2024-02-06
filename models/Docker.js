const mongoose = require("mongoose");

const communityDockerSchema = new mongoose.Schema({
  containerName: {
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
    unique: true,
  },
  communityName: {
    type: String,
    required: true,
    unique: true,
  },
  domain: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = mongoose.model("Docker", communityDockerSchema);
