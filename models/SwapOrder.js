const mongoose = require('mongoose');

const swapOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  derivationIndex: {
    type: Number,
    required: false, // Used exclusively for non-Hive HD Web3 Deposit address maps
    index: true
  },
  username: {
    type: String,
    required: true, // Hive username of the initiator
    index: true
  },
  fromCurrency: {
    type: String,
    required: true
  },
  toCurrency: {
    type: String,
    required: true
  },
  amountExpected: {
    type: Number,
    required: true
  },
  amountToPayout: {
    type: Number,
    required: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  depositAddress: {
    type: String,
    required: true, // Auto-generated crypto address OR '@sovraniche.hot'
  },
  depositMemo: {
    type: String,
    default: "" // Used if paying with HIVE/HBD
  },
  targetPayoutWallet: {
    type: String,
    required: true, // Where the user receives the final funds
  },
  status: {
    type: String,
    enum: ['PENDING', 'DEPOSIT_DETECTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'EXPIRED'],
    default: 'PENDING'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // Orders expire in 15 minutes
  },
  txHashDeposit: {
    type: String, // Filled when user deposit is detected
    default: ""
  },
  txHashPayout: {
    type: String, // Filled when Treasury dispenses payout
    default: ""
  },
  feeProfit: {
    type: Number, // Gross profit (3% spread) in the receiveCurrency
    default: 0
  },
  feeProfitUSD: {
    type: Number, // USD value of the profit at the time of quote
    default: 0
  }
}, { timestamps: true });

// Add an index to automatically clear expired orders if desired, or index by status
swapOrderSchema.index({ status: 1 });

module.exports = mongoose.model('SwapOrder', swapOrderSchema);
