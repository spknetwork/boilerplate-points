const mongoose = require("mongoose");
const PointSchema = require("./Point");

const BitcoinMachinesSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  referral: {
    type: String,
  },
  bitcoinAddress: {
    type: String,
    unique: true,
  },
  ordinalAddress: {
    type: String,
    unique: true,
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

module.exports = mongoose.model("BtcMachines", BitcoinMachinesSchema);
