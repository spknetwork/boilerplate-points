const mongoose = require('mongoose');

const offchainUserSchema = new mongoose.Schema({
  solanaWalletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
},
{
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  });

module.exports = mongoose.model('OffchainUser', offchainUserSchema);
