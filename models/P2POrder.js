const mongoose = require('mongoose');

const p2pOrderSchema = new mongoose.Schema({
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'P2PAd', required: true, index: true },
  makerId: { type: String, required: true, index: true }, // Ad owner
  takerId: { type: String, required: true, index: true }, // Trade initiator
  type: { type: String, enum: ['BUY', 'SELL'], required: true }, // Refers to what the Maker is doing
  cryptoCurrency: { type: String, required: true },
  cryptoAmount: { type: Number, required: true },
  fiatCurrency: { type: String, required: true },
  fiatAmount: { type: Number, required: true },
  price: { type: Number, required: true },
  status: { 
      type: String, 
      enum: ['AWAITING_PAYMENT', 'RELEASING', 'COMPLETED', 'DISPUTED', 'CANCELLED'],
      default: 'AWAITING_PAYMENT' 
  },
  paymentDeadline: { type: Date, required: true },
  paymentMethodDetails: { type: mongoose.Schema.Types.Mixed }, // Which bank was requested
  chatLog: [{
      sender: String,
      text: String,
      timestamp: { type: Date, default: Date.now },
      metadata: { type: mongoose.Schema.Types.Mixed } // Event flags e.g., "I have paid"
  }]
}, { timestamps: true });

module.exports = mongoose.model('P2POrder', p2pOrderSchema);
