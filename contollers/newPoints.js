const UserPoints = require("../models/UserPoints");
const PointLedger = require("../models/PointLedger");

// Core function to safely award points and log the transaction
const awardPoints = async (req, res) => {
    try {
        const { username, communityId, actionType, metadata } = req.body;

        if (!username || !communityId || !actionType) {
            return res.status(400).json({ success: false, msg: "Missing required fields" });
        }

        const cleanUsername = username.toLowerCase();

        // Define point values per action
        const pointValues = {
            login: 10,
            posts: 5,
            comments: 2,
            upvote: 1,
            reblog: 1,
            delegation: 50, // This logic might need a daily listener, but keeping mapped for now
            community: 50,
            checking: 1,
        };

        const pointsToAward = pointValues[actionType];

        if (!pointsToAward) {
            return res.status(400).json({ success: false, msg: "Invalid actionType" });
        }

        // Rate Limiting Logic via Ledger
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (actionType === "login") {
            // Max 2 logins per day mapped in original system, let's keep it simple: 2 logins per day
            const loginsToday = await PointLedger.countDocuments({
                username: cleanUsername,
                communityId,
                actionType: "login",
                createdAt: { $gte: today },
            });

            if (loginsToday >= 2) {
                return res.status(200).json({ success: true, msg: "Max login points reached for today." });
            }
        }

        // Insert into Ledger
        const ledgerEntry = new PointLedger({
            username: cleanUsername,
            communityId,
            actionType,
            points: pointsToAward,
            metadata,
        });
        await ledgerEntry.save();

        // Update Aggregated Balances
        const userPoints = await UserPoints.findOneAndUpdate(
            { username: cleanUsername, communityId },
            {
                $setOnInsert: { username: cleanUsername, communityId },
                $inc: { unclaimedPoints: pointsToAward },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({ success: true, balance: userPoints, ledger: ledgerEntry });
    } catch (error) {
        console.error("Award Points Error:", error);
        return res.status(500).json({ success: false, msg: "Internal server error" });
    }
};

const getBalance = async (req, res) => {
    try {
        const { username, communityId } = req.params;

        const cleanUsername = username.toLowerCase();

        let userPoints = await UserPoints.findOne({ username: cleanUsername, communityId });

        if (!userPoints) {
            userPoints = {
                username: cleanUsername,
                communityId,
                totalPoints: 0,
                unclaimedPoints: 0
            };
        }

        return res.status(200).json({ success: true, data: userPoints });
    } catch (error) {
        console.error("Get Balance Error:", error);
        return res.status(500).json({ success: false, msg: "Internal server error" });
    }
};

const getLedger = async (req, res) => {
    try {
        const { username, communityId } = req.params;
        const cleanUsername = username.toLowerCase();

        // Fetch the 50 most recent transactions
        const ledger = await PointLedger.find({ username: cleanUsername, communityId })
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json({ success: true, data: ledger });
    } catch (error) {
        console.error("Get Ledger Error:", error);
        return res.status(500).json({ success: false, msg: "Internal server error" });
    }
};

const claimPoints = async (req, res) => {
    try {
        const { username, communityId } = req.body;

        if (!username || !communityId) {
            return res.status(400).json({ success: false, msg: "Missing required fields" });
        }

        const cleanUsername = username.toLowerCase();

        const userPoints = await UserPoints.findOne({ username: cleanUsername, communityId });

        if (!userPoints || userPoints.unclaimedPoints <= 0) {
            return res.status(400).json({ success: false, msg: "No points available to claim" });
        }

        // Move unclaimedPoints to totalPoints
        const amountToClaim = userPoints.unclaimedPoints;
        userPoints.totalPoints += amountToClaim;
        userPoints.unclaimedPoints = 0;
        await userPoints.save();

        return res.status(200).json({ success: true, msg: `${amountToClaim} points claimed successfully`, data: userPoints });

    } catch (error) {
        console.error("Claim Points Error:", error);
        return res.status(500).json({ success: false, msg: "Internal server error" });
    }
}

const transferPoints = async (req, res) => {
    try {
        const { senderUsername, receiverUsername, community, amount } = req.body;

        if (!senderUsername || !receiverUsername || !community || !amount || amount <= 0) {
            return res.status(400).json({ success: false, msg: "Invalid transfer parameters" });
        }

        const cleanSender = senderUsername.toLowerCase();
        const cleanReceiver = receiverUsername.toLowerCase();

        // 1. Check sender balance (using totalPoints for confirmed balance)
        const senderRecord = await UserPoints.findOne({ username: cleanSender, communityId: community });
        if (!senderRecord || senderRecord.totalPoints < amount) {
            return res.status(400).json({ success: false, msg: "Insufficient balance" });
        }

        // 2. Get/Create receiver record
        const receiverRecord = await UserPoints.findOneAndUpdate(
            { username: cleanReceiver, communityId: community },
            { $setOnInsert: { username: cleanReceiver, communityId: community } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 3. Atomically update balances
        senderRecord.totalPoints -= amount;
        receiverRecord.totalPoints += amount;

        await senderRecord.save();
        await receiverRecord.save();

        // 4. Log to Ledger
        await PointLedger.create([
            {
                username: cleanSender,
                communityId: community,
                actionType: 'transfer_out',
                points: -amount,
                metadata: { to: cleanReceiver }
            },
            {
                username: cleanReceiver,
                communityId: community,
                actionType: 'transfer_in',
                points: amount,
                metadata: { from: cleanSender }
            }
        ]);

        return res.status(200).json({ success: true, message: "Points transferred successfully" });

    } catch (error) {
        console.error("Transfer Points Error:", error);
        return res.status(500).json({ success: false, msg: "Internal server error" });
    }
};

module.exports = {
    awardPoints,
    getBalance,
    getLedger,
    claimPoints,
    transferPoints
};
