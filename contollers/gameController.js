const { Client, PrivateKey } = require("@hiveio/dhive");
const UserPoints = require("../models/UserPoints");
const PointLedger = require("../models/PointLedger");

// Mainnet client
const client = new Client([
    "https://api.hive.blog",
    "https://api.deathwing.me",
    "https://api.openhive.network",
]);

// We will use a dedicated platform account for receiving and sending funds.
const PLATFORM_ACCOUNT = process.env.SOVRA_ARCADE_HIVE_ACCOUNT || "breakaway.app";
const PLATFORM_ACTIVE_KEY = process.env.SOVRA_ARCADE_HIVE_ACTIVE_KEY;

// Temporary in-memory cache to prevent double-spending trx_ids (In production, use MongoDB)
const processedTransactions = new Set();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getTransactionWithRetry = async (trx_id, retries = 5, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const tx = await client.database.getTransaction(trx_id);
            if (tx && tx.operations && tx.operations.length > 0) {
                return tx;
            }
        } catch (error) {
            // It often throws an error if it hasn't propagated yet
            console.log(`Transaction ${trx_id} not found yet, retrying... (${i + 1}/${retries})`);
        }
        await sleep(delay);
    }
    return null;
};

/**
 * buyPoints: Verifies a Hive transaction and awards points to the user.
 * 1 HBD/HIVE = 50 Points
 */
const buyPoints = async (req, res) => {
    try {
        const { username, trx_id, amount, currency, communityId } = req.body;

        if (!username || !trx_id || !amount || !currency) {
            return res.status(400).json({ success: false, msg: "Missing required fields" });
        }

        if (processedTransactions.has(trx_id)) {
            return res.status(400).json({ success: false, msg: "Transaction already processed" });
        }

        // Verify the transaction on the blockchain (with retries for propagation delay)
        const tx = await getTransactionWithRetry(trx_id);
        
        if (!tx) {
            return res.status(400).json({ success: false, msg: "Transaction not found on chain after waiting" });
        }

        const op = tx.operations[0];
        if (op[0] !== 'transfer') {
            return res.status(400).json({ success: false, msg: "Transaction is not a transfer" });
        }

        const transferData = op[1];

        // Ensure the transfer is valid
        if (
            transferData.to !== PLATFORM_ACCOUNT ||
            transferData.from !== username ||
            transferData.amount !== `${parseFloat(amount).toFixed(3)} ${currency}`
        ) {
            return res.status(400).json({ success: false, msg: "Invalid transfer details" });
        }

        // Calculate points based on currency
        let pointsToAward = 0;
        const parsedAmount = parseFloat(amount);
        
        if (currency === 'HBD') {
            pointsToAward = Math.floor(parsedAmount * 50);
        } else if (currency === 'HIVE') {
            // Fetch current median history price to get HIVE to HBD ratio
            const price = await client.database.getCurrentMedianHistoryPrice();
            const baseHbd = parseFloat(price.base.toString().split(' ')[0]); // e.g. "1.000 HBD" -> 1.000
            const quoteHive = parseFloat(price.quote.toString().split(' ')[0]); // e.g. "3.315 HIVE" -> 3.315
            
            const hiveToHbdRatio = baseHbd / quoteHive;
            const equivalentHbd = parsedAmount * hiveToHbdRatio;
            
            pointsToAward = Math.floor(equivalentHbd * 50);
        }

        // Process the points update
        const cleanUsername = username.toLowerCase();
        const cid = communityId || "sovraniche";

        let userPoints = await UserPoints.findOne({ username: cleanUsername, communityId: cid });
        if (!userPoints) {
            userPoints = new UserPoints({
                username: cleanUsername,
                communityId: cid,
                totalPoints: 0,
                unclaimedPoints: 0,
            });
        }

        userPoints.totalPoints += pointsToAward;
        await userPoints.save();

        // Log the ledger
        const ledgerEntry = new PointLedger({
            username: cleanUsername,
            communityId: cid,
            actionType: "buy_points",
            points: pointsToAward,
            metadata: { trx_id, amount, currency }
        });
        await ledgerEntry.save();

        processedTransactions.add(trx_id);

        return res.status(200).json({
            success: true,
            msg: `Successfully purchased ${pointsToAward} points!`,
            newBalance: userPoints.totalPoints
        });

    } catch (error) {
        console.error("Error in buyPoints:", error);
        return res.status(500).json({ success: false, msg: "Server error processing transaction" });
    }
};

/**
 * playStage: Deducts 0.5 Points to start a game stage
 */
const playStage = async (req, res) => {
    try {
        const { username, communityId } = req.body;
        if (!username) return res.status(400).json({ success: false, msg: "Missing username" });

        const cleanUsername = username.toLowerCase();
        const cid = communityId || "sovraniche";

        let userPoints = await UserPoints.findOne({ username: cleanUsername, communityId: cid });
        if (!userPoints || userPoints.totalPoints < 0.5) {
            return res.status(400).json({ success: false, msg: "Not enough points. Need 0.5 PTS to play." });
        }

        userPoints.totalPoints -= 0.5;
        await userPoints.save();

        const ledgerEntry = new PointLedger({
            username: cleanUsername,
            communityId: cid,
            actionType: "transfer_out",
            points: -0.5,
            metadata: { memo: "Played Stage in Cyber-Node Runner" }
        });
        await ledgerEntry.save();

        return res.status(200).json({ success: true, newBalance: userPoints.totalPoints });
    } catch (error) {
        console.error("Error in playStage:", error);
        return res.status(500).json({ success: false, msg: "Server error" });
    }
};

/**
 * treasurePayout: Handles payouts from Treasure Boxes (Points or Real HIVE/HBD)
 */
const treasurePayout = async (req, res) => {
    try {
        const { username, rewardType, amount, communityId } = req.body;

        if (!username || !rewardType || !amount) {
            return res.status(400).json({ success: false, msg: "Missing required fields" });
        }

        const cleanUsername = username.toLowerCase();
        const cid = communityId || "sovraniche";

        if (rewardType === "points") {
            // Give points
            let userPoints = await UserPoints.findOne({ username: cleanUsername, communityId: cid });
            if (!userPoints) {
                userPoints = new UserPoints({ username: cleanUsername, communityId: cid, totalPoints: 0, unclaimedPoints: 0 });
            }
            userPoints.totalPoints += amount;
            await userPoints.save();

            const ledgerEntry = new PointLedger({
                username: cleanUsername,
                communityId: cid,
                actionType: "treasure_reward_points",
                points: amount,
            });
            await ledgerEntry.save();

            return res.status(200).json({ success: true, msg: `Rewarded ${amount} points`, newBalance: userPoints.totalPoints });

        } else if (rewardType === "HIVE" || rewardType === "HBD") {
            // Give real tokens (Stores in DB Balance)
            let userPoints = await UserPoints.findOne({ username: cleanUsername, communityId: cid });
            if (!userPoints) {
                userPoints = new UserPoints({ username: cleanUsername, communityId: cid });
            }
            
            if (rewardType === "HIVE") {
                userPoints.hiveBalance = (userPoints.hiveBalance || 0) + parseFloat(amount);
            } else {
                userPoints.hbdBalance = (userPoints.hbdBalance || 0) + parseFloat(amount);
            }
            await userPoints.save();

            // Log it in ledger for history
            const ledgerEntry = new PointLedger({
                username: cleanUsername,
                communityId: cid,
                actionType: "treasure_reward_crypto",
                points: 0,
                metadata: { amount: `${amount} ${rewardType}` }
            });
            await ledgerEntry.save();

            return res.status(200).json({ 
                success: true, 
                msg: `Loot saved!`, 
                hiveBalance: userPoints.hiveBalance, 
                hbdBalance: userPoints.hbdBalance 
            });
        } else {
            return res.status(400).json({ success: false, msg: "Invalid rewardType" });
        }
    } catch (error) {
        console.error("Error in treasurePayout:", error);
        return res.status(500).json({ success: false, msg: "Server error processing payout" });
    }
};

/**
 * withdrawCrypto: Transfers accumulated HIVE/HBD from DB to player's Hive wallet
 */
const withdrawCrypto = async (req, res) => {
    try {
        const { username, communityId } = req.body;
        if (!username) return res.status(400).json({ success: false, msg: "Missing username" });

        const cleanUsername = username.toLowerCase();
        const cid = communityId || "sovraniche";

        let userPoints = await UserPoints.findOne({ username: cleanUsername, communityId: cid });
        if (!userPoints) return res.status(400).json({ success: false, msg: "No record found" });

        const withdrawHive = userPoints.hiveBalance || 0;
        const withdrawHbd = userPoints.hbdBalance || 0;

        if (withdrawHive <= 0 && withdrawHbd <= 0) {
            return res.status(400).json({ success: false, msg: "No crypto to withdraw." });
        }

        if (!PLATFORM_ACTIVE_KEY) {
            return res.status(500).json({ success: false, msg: "Platform active key not configured" });
        }

        const activeKey = PrivateKey.fromString(PLATFORM_ACTIVE_KEY);
        const operations = [];

        if (withdrawHive > 0) {
            operations.push(['transfer', {
                from: PLATFORM_ACCOUNT,
                to: cleanUsername,
                amount: `${parseFloat(withdrawHive).toFixed(3)} HIVE`,
                memo: "Loot Withdrawal from Sovraniche Arcade!"
            }]);
        }
        
        if (withdrawHbd > 0) {
            operations.push(['transfer', {
                from: PLATFORM_ACCOUNT,
                to: cleanUsername,
                amount: `${parseFloat(withdrawHbd).toFixed(3)} HBD`,
                memo: "Loot Withdrawal from Sovraniche Arcade!"
            }]);
        }

        // Broadcast the transaction(s)
        await client.broadcast.sendOperations(operations, activeKey);

        // Reset balances
        userPoints.hiveBalance = 0;
        userPoints.hbdBalance = 0;
        await userPoints.save();

        return res.status(200).json({ success: true, msg: "Successfully withdrawn to your wallet!" });

    } catch (error) {
        console.error("Error in withdrawCrypto:", error);
        return res.status(500).json({ success: false, msg: "Server error during withdrawal" });
    }
};

/**
 * saveProgress: Saves the player's highest stage to the DB
 */
const saveProgress = async (req, res) => {
    try {
        const { username, highestStage, communityId } = req.body;
        if (!username || !highestStage) return res.status(400).json({ success: false, msg: "Missing parameters" });

        const cleanUsername = username.toLowerCase();
        const cid = communityId || "sovraniche";

        let userPoints = await UserPoints.findOne({ username: cleanUsername, communityId: cid });
        if (!userPoints) {
            userPoints = new UserPoints({ username: cleanUsername, communityId: cid });
        }

        if (highestStage > userPoints.cyberHighestStage) {
            userPoints.cyberHighestStage = highestStage;
            await userPoints.save();
        }

        return res.status(200).json({ success: true, cyberHighestStage: userPoints.cyberHighestStage });

    } catch (error) {
        console.error("Error in saveProgress:", error);
        return res.status(500).json({ success: false, msg: "Server error" });
    }
};

/**
 * spendPoints: Generic endpoint to spend points
 */
const spendPoints = async (req, res) => {
    try {
        const { username, amount, communityId, memo } = req.body;
        if (!username || !amount) return res.status(400).json({ success: false, msg: "Missing parameters" });

        const cleanUsername = username.toLowerCase();
        const cid = communityId || "sovraniche";
        const spendAmount = parseFloat(amount);

        if (isNaN(spendAmount) || spendAmount <= 0) {
            return res.status(400).json({ success: false, msg: "Invalid amount" });
        }

        let userPoints = await UserPoints.findOne({ username: cleanUsername, communityId: cid });
        if (!userPoints || userPoints.totalPoints < spendAmount) {
            return res.status(400).json({ success: false, msg: "Not enough points." });
        }

        userPoints.totalPoints -= spendAmount;
        await userPoints.save();

        const ledgerEntry = new PointLedger({
            username: cleanUsername,
            communityId: cid,
            actionType: "transfer_out",
            points: -spendAmount,
            metadata: { memo: memo || "Spent points" }
        });
        await ledgerEntry.save();

        return res.status(200).json({ success: true, newBalance: userPoints.totalPoints });
    } catch (error) {
        console.error("Error in spendPoints:", error);
        return res.status(500).json({ success: false, msg: "Server error" });
    }
};

module.exports = {
    buyPoints,
    treasurePayout,
    playStage,
    withdrawCrypto,
    saveProgress,
    spendPoints
};
