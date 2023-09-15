const mongoose = require('mongoose');
const schema = mongoose.Schema;
const PointSchema = require('./Point');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  points: [PointSchema.schema]
}); 

module.exports = mongoose.model('User', UserSchema);
