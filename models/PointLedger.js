const mongoose = require("mongoose");

const PointLedgerSchema = new mongoose.Schema(
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
        actionType: {
            type: String,
            enum: [
                "login",
                "posts",
                "comments",
                "upvote",
                "reblog",
                "delegation",
                "community",
                "checking",
                "transfer_in",
                "transfer_out",
                "buy_points",
                "treasure_reward_points",
                "treasure_reward_crypto",
            ],
            required: true,
            index: true,
        },
        points: {
            type: Number,
            required: true,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed, // Can store permlink, tx id, etc to prevent duplicates
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("PointLedger", PointLedgerSchema);
