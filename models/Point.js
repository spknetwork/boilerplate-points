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
    "10": Number,
    "20": Number,
    "30": Number,
    "100": Number,
    "110": Number,
    "120": Number,
    "130": Number,
    "150": Number,
    "160": Number,
  },
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

module.exports = mongoose.model('Point', PointSchema);