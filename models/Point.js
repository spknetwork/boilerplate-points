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
    posts: {
      points: Number,
      awarded_timestamps: [Number],
    },
    comments: {
      points: Number,
      awarded_timestamps: [Number],
    },
    upvote: {
      points: Number,
      awarded_timestamps: [Number],
    },
    reblog: {
      points: Number,
      awarded_timestamps: [Number],
    },
    login: {
      points: Number,
      awarded_timestamps: [Number],
    },
    delegation: {
      points: Number,
      awarded_timestamps: [Number],
    },
    community: {
      points: Number,
      awarded_timestamps: [Number],
    },
    checking: {
      points: Number,
      awarded_timestamps: [Number],
    },
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

module.exports = mongoose.model('Point', PointSchema);
