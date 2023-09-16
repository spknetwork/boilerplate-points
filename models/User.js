const mongoose = require('mongoose');
const PointSchema = require('./Point');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  points: [PointSchema.schema]
},
{
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}); 

module.exports = mongoose.model('User', UserSchema);
