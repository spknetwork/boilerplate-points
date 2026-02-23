const { PrivateKey } = require('@hiveio/dhive');
const client = require("../hive/client");

/**
 * Relay Controller
 * Handles broadcasting operations signed by the platform account
 */
const broadcastRelay = async (req, res) => {
    try {
        const { username, operations } = req.body;

        if (!username || !operations || !Array.isArray(operations)) {
            return res.status(400).json({ success: false, error: "Invalid request parameters" });
        }

        // 1. Verify user session (handled by authenticateToken middleware)
        if (req.user.username !== username) {
            return res.status(403).json({ success: false, error: "Unauthorized user" });
        }

        // 2. Verify on-chain delegation
        const [account] = await client.database.getAccounts([username]);
        if (!account) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const relayAccount = process.env.HIVE_RELAY_ACCOUNT || 'obcdonations';
        const isAuthorized = account.posting.account_auths.some(
            auth => auth[0] === relayAccount
        );

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                error: `Posting authority not delegated to @${relayAccount}. Please authorize first.`
            });
        }

        // 3. Prepare operations
        // We only allow certain "Posting" level operations for safety
        const allowedOps = ['vote', 'comment', 'custom_json'];
        for (const op of operations) {
            if (!allowedOps.includes(op[0])) {
                return res.status(403).json({ success: false, error: `Operation type '${op[0]}' is not allowed via relay` });
            }

            // Ensure the user is actually the one performing the action
            // For vote: op[1].voter
            // For comment: op[1].author
            // For custom_json: op[1].required_posting_auths
            if (op[0] === 'vote' && op[1].voter !== username) return res.status(403).json({ success: false, error: "Voter mismatch" });
            if (op[0] === 'comment' && op[1].author !== username) return res.status(403).json({ success: false, error: "Author mismatch" });
            if (op[0] === 'custom_json' && (!op[1].required_posting_auths || !op[1].required_posting_auths.includes(username))) {
                return res.status(403).json({ success: false, error: "Posting authority mismatch" });
            }
        }

        // 4. Sign and Broadcast
        const relayKey = PrivateKey.fromString(process.env.HIVE_RELAY_POSTING_KEY);
        const result = await client.broadcast.sendOperations(operations, relayKey);

        console.log(`✅ [Relay] Broadcasted operations for @${username}, tx: ${result.id}`);
        return res.json({ success: true, result });

    } catch (error) {
        console.error("Relay Error:", error.message);
        return res.status(500).json({ success: false, error: error.message || "Failed to broadcast via relay" });
    }
};

module.exports = { broadcastRelay };
