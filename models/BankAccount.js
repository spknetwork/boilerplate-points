const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        index: true
    },
    bankName: {
        type: String,
        required: true
    },
    accountName: {
        type: String,
        required: true
    },
    accountNumber: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
