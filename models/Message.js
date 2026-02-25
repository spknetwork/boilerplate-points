const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true,
        index: true
    },
    to: {
        type: String,
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: String,
        required: true
    },
    v: {
        type: String,
        default: '1.0'
    },
    trx_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
