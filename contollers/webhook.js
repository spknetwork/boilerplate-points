// In-memory mapping of address to Hive username
// Keys are normalized to lowercase addresses
const addressToUser = new Map();

// In-memory cache of recently processed transaction hashes to prevent duplicate webhook notifications
const recentProcessedHashes = new Set();
const isHashAlreadyProcessed = (hash) => {
    if (!hash) return false;
    const lower = hash.toLowerCase();
    if (recentProcessedHashes.has(lower)) return true;
    recentProcessedHashes.add(lower);
    setTimeout(() => recentProcessedHashes.delete(lower), 10 * 60 * 1000); // 10-minute TTL
    return false;
};

/**
 * Register an address to a user (called via Socket)
 */
const registerAddressMapping = (username, addresses) => {
    if (!username || !addresses) return;
    const cleanUsername = username.replace(/^@/, '');

    addresses.forEach(addr => {
        if (addr) addressToUser.set(addr.toLowerCase(), cleanUsername);
    });
};

/**
 * Handle incoming webhooks from Alchemy Notify (Address Activity)
 */
const handleAlchemyWebhook = async (req, res) => {
    const { event } = req.body;

    if (!event || !event.activity) {
        return res.status(200).send('No activity found');
    }

    try {
        const io = req.app.get('socketio');

        for (const activity of event.activity) {
            const { toAddress, value, asset, hash, category } = activity;

            if (!toAddress) continue;
            
            // Deduplicate: If this transaction hash was processed within the last 10 minutes, ignore duplicate deliveries
            if (hash && isHashAlreadyProcessed(hash)) {
                console.log(`[Webhook] Skipping duplicate webhook delivery for tx hash: ${hash}`);
                continue;
            }
            
            // --- NEW: Process Cross-Chain Swaps for EVM networks ---
            try {
                 const SwapOrder = require('../models/SwapOrder');
                 const swapController = require('./swap');
                 
                 const pendingSwap = await SwapOrder.findOne({
                     depositAddress: { $regex: new RegExp(`^${toAddress}$`, 'i') },
                     status: 'PENDING'
                 });

                 if (pendingSwap && parseFloat(value) >= parseFloat(pendingSwap.amountExpected)) {
                     pendingSwap.status = 'DEPOSIT_DETECTED';
                     pendingSwap.txHashDeposit = hash;
                     await pendingSwap.save();
                     console.log(`✅ [Swap Matrix - Alchemy Webhook] Detected EVM deposit of ${value} ${asset} for order ${pendingSwap.orderId}. Initiating Cross-Chain Bridge!`);
                     swapController.executeOutbound(pendingSwap.orderId).catch(e => console.error("Alchemy Webhook Execute Error", e));
                 }
            } catch(swapErr) {
                 console.error("Alchemy Swap Processing Error:", swapErr);
            }
            // --------------------------------------------------------

            // Look up the username in our current active session cache
            const username = addressToUser.get(toAddress.toLowerCase());

            if (username && io) {
                // Emit to the specific user room
                io.to(`user:${username}`).emit('web3_deposit', {
                    chain: asset,
                    address: toAddress,
                    amount: value,
                    hash: hash,
                    category: category
                });
                console.log(`[Webhook] Notified ${username} of ${value} ${asset} deposit`);
            } else {
                console.log(`[Webhook] No active session found for address: ${toAddress}`);
            }
        }

        return res.status(200).send('Webhook processed');
    } catch (err) {
        console.error('[Webhook Error]', err);
        return res.status(500).send('Internal server error');
    }
};

module.exports = {
    handleAlchemyWebhook,
    registerAddressMapping
};
