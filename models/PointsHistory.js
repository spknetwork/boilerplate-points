const mongoose = require('mongoose');

const pointsHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  communityName: String,
  pointsEarned: Number,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PointsHistory', pointsHistorySchema);
