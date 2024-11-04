const mongoose = require("mongoose");
const PointSchema = require("./Point");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  referral: {
    type: String,
  },
  bitcoinAddress: {
    type: String,
    unique: true,
    sparse: true,
  },
  signature: {
    type: String,
  },
  ownsBTCMachine: {
    type: Boolean,
    default: false,
  }
},
{
  timestamps: {
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}); 

module.exports = mongoose.model("User", UserSchema);
