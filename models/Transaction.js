const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  communityName: {
    type: String,
    required: true,
  },
  pointsTransferred: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
},
{
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
},
});

module.exports = mongoose.model('Transaction', TransactionSchema);
