const axios = require('axios');
const SwapOrder = require('../models/SwapOrder');
const swapController = require('../contollers/swap');

// Map fromCurrency values → the oracle chain key for balance checks
const CURRENCY_TO_ORACLE_CHAIN = {
    TRX:        'TRON',
    USDT_TRC20: 'USDT_TRC20',
    ETH:        'ETH',
    USDT_ERC20: 'USDT_ERC20',
    BNB:        'BNB',
    USDT_BEP20: 'USDT_BEP20',
    BTC:        'BTC',
    SOL:        'SOL',
    SOL_USDT:   'SOL_USDT',
};

// All external (non-Hive) currencies the watcher should monitor
const WATCHED_CURRENCIES = Object.keys(CURRENCY_TO_ORACLE_CHAIN);

const startTronDepositWatcher = () => {
    console.log("🚀 Starting universal multi-chain deposit watcher for cross-chain swaps...");
    console.log(`   Watching currencies: ${WATCHED_CURRENCIES.join(', ')}`);

    setInterval(async () => {
        try {
            // Find all PENDING external swaps (non-Hive — those are handled by hive.js)
            const pendingOrders = await SwapOrder.find({
                status: 'PENDING',
                fromCurrency: { $in: WATCHED_CURRENCIES }
            });

            if (pendingOrders.length === 0) return;

            console.log(`🔍 [Swap Watcher] Checking ${pendingOrders.length} pending order(s)...`);

            for (const order of pendingOrders) {
                const oracleChain = CURRENCY_TO_ORACLE_CHAIN[order.fromCurrency];
                if (!oracleChain) {
                    console.warn(`⚠️ [Swap Watcher] Unknown fromCurrency: ${order.fromCurrency} for order ${order.orderId}`);
                    continue;
                }

                // Build wallet query payload for the oracle
                const walletsPayload = {
                    [oracleChain]: { address: order.depositAddress }
                };

                try {
                    const infoRes = await axios.post(
                        `${process.env.EXTERNAL_WALLET_URL || 'http://localhost:4001'}/api/wallet/info`,
                        { wallets: walletsPayload }
                    );

                    if (!infoRes.data?.success) continue;

                    const walletInfo = infoRes.data.walletInfo || [];
                    const info = walletInfo.find(
                        w => w.chain === oracleChain && w.address === order.depositAddress
                    );

                    if (!info || info.balance === null) continue;

                    const receivedAmount = parseFloat(info.balance);
                    const expectedAmount = parseFloat(order.amountExpected);

                    if (receivedAmount >= expectedAmount) {
                        order.status = 'DEPOSIT_DETECTED';
                        await order.save();
                        console.log(`✅ [Swap Watcher] Detected ${receivedAmount} ${oracleChain} for order ${order.orderId} (expected ${expectedAmount}). Initiating bridge!`);
                        swapController.executeOutbound(order.orderId).catch(e =>
                            console.error(`❌ [Swap Watcher] Outbound execute error for ${order.orderId}:`, e.message)
                        );
                    }
                } catch (err) {
                    // Per-order fallback: log but don't crash the entire watcher cycle
                    console.error(`❌ [Swap Watcher] Balance check failed for order ${order.orderId} (${oracleChain}):`, err.message);
                }
            }
        } catch (err) {
            console.error("❌ [Swap Watcher] Global poll error:", err.message);
        }
    }, 15000); // Poll every 15 seconds
};

module.exports = { startTronDepositWatcher };
