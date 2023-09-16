const mongoose = require('mongoose');
const PointSchema = require('./Point');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  // points: [PointSchema.schema] //Not sure we still need this
},
{
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}); 

module.exports = mongoose.model('User', UserSchema);
