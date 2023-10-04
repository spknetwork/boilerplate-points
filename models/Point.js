const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  communityName: String,
  pointsBalance: Number,
  symbol: String,
  unclaimedPoints: Number,
  points_by_type: {
    posts: Number,
    comments: Number,
    upvote: Number,
    reblog: Number,
    login: Number,
    delegation: Number,
    community: Number,
    checking: Number,
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = mongoose.model('Point', PointSchema);