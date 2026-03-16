const mongoose = require("mongoose");

const UserPointsSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            index: true,
            lowercase: true,
        },
        communityId: {
            type: String,
            required: true,
            index: true,
        },
        totalPoints: {
            type: Number,
            default: 0,
            min: 0,
        },
        unclaimedPoints: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

// Ensure a user only has one points record per community
UserPointsSchema.index({ username: 1, communityId: 1 }, { unique: true });

module.exports = mongoose.model("UserPoints", UserPointsSchema);
