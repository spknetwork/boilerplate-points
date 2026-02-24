const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: { type: String, required: true, index: true },
    to: { type: String, required: true, index: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    trx_id: { type: String, unique: true },
    v: { type: String, default: '1.0' },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date }
});

// Compound index for efficient conversation retrieval
messageSchema.index({ from: 1, to: 1, timestamp: -1 });
messageSchema.index({ to: 1, from: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
