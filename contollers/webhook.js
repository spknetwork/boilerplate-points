// In-memory mapping of address to Hive username
// Keys are normalized to lowercase addresses
const addressToUser = new Map();

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
