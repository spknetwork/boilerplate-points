const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema({
  communityName: {
    type: String,
    required: true,
  },
  about: {
    type: String,
  },
  communityFounder: {
    type: String,
    required: true,
  },
  communityId: {
    type: String,
    required: true,
    unique: true,
  },
});

module.exports = mongoose.model("Community", communitySchema);
