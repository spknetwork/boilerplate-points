const mongoose = require('mongoose');

const p2pAdSchema = new mongoose.Schema({
  makerId: { type: String, required: true, index: true }, // Hive Username
  type: { type: String, enum: ['BUY', 'SELL'], required: true },
  cryptoCurrency: { type: String, required: true }, // HIVE, HBD
  fiatCurrency: { type: String, required: true }, // USD, NGN, GBP, etc.
  price: { type: Number, required: true }, // Fiat execution exchange rate
  minLimit: { type: Number, required: true }, // Minimum bound in fiat
  maxLimit: { type: Number, required: true }, // Maximum bound in fiat
  totalCryptoAmount: { type: Number, default: 0 },
  availableCryptoAmount: { type: Number, default: 0 },
  paymentMethods: [{ type: String }], // Arrays of allowed banks/channels
  bankDetails: { type: mongoose.Schema.Types.Mixed }, // Specific merchant bank info
  terms: { type: String, default: '' }, // Merchant's custom trade rules
  status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CLOSED'], default: 'ACTIVE' }
}, { timestamps: true });

// Compound index to help quickly fetch active ads for the market dashboard
p2pAdSchema.index({ cryptoCurrency: 1, fiatCurrency: 1, type: 1, status: 1 });

module.exports = mongoose.model('P2PAd', p2pAdSchema);
