const mongoose = require("mongoose");

const watcherStateSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        default: "hive_payment_watcher"
    },
    lastBlock: {
        type: Number,
        required: true,
        default: 0
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("WatcherState", watcherStateSchema);
