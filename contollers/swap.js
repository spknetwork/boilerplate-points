const SwapOrder = require('../models/SwapOrder');
const axios = require('axios');
const crypto = require('crypto');
const dhive = require('@hiveio/dhive');
const client = new dhive.Client(['https://api.hive.blog', 'https://api.openhive.network']);
exports.initiateSwap = async (req, res) => {
    try {
        const { username, payCoin, receiveCoin, amount, destinationAddress } = req.body;
        
        if (!username || !payCoin || !receiveCoin || !amount || !destinationAddress) {
            return res.status(400).json({ error: "Missing required parameters." });
        }

        // 1. Fetch live quote from Ba-external-wallet Oracle to ensure mathematical market accuracy
        const externalUrl = process.env.EXTERNAL_WALLET_URL || 'http://localhost:4001';
        const quoteRes = await axios.get(`${externalUrl}/api/swap/quote?pay=${payCoin}&receive=${receiveCoin}&amount=${amount}`);
        const quote = quoteRes.data;

        // 2. Algorithmically Generate unique Deposit Instructions
        let depositAddress = "";
        let depositMemo = "";
        let finalIndex = undefined;

        if (payCoin === 'HIVE' || payCoin === 'HBD') {
            depositAddress = process.env.HIVE_SWAP_HOT_WALLET ? `@${process.env.HIVE_SWAP_HOT_WALLET}` : '@sovra.swap'; // Dynamically pulls Treasury from .env
            // Generate a secure, unique routing memo
            const randomSlug = crypto.randomBytes(3).toString('hex').toUpperCase();
            depositMemo = `Swap-${randomSlug}`;
        } else {
            // External Pay Coin! We must generate a mathematically isolated Deposit wallet via the HD Factory
            // To prevent burning 1.1 TRX repeatedly per swap, we map ONE permanent deposit index per user.
            const existingSwap = await SwapOrder.findOne({ username, derivationIndex: { $exists: true, $ne: null } }).sort({ derivationIndex: -1 });

            if (existingSwap && existingSwap.derivationIndex !== undefined) {
                 finalIndex = existingSwap.derivationIndex;
            } else {
                 // First-time swapper! Find the highest absolute Treasury index used globally and increment by 1
                 const lastSwap = await SwapOrder.findOne({ derivationIndex: { $exists: true, $ne: null } }).sort({ derivationIndex: -1 });
                 finalIndex = lastSwap && lastSwap.derivationIndex >= 2 ? lastSwap.derivationIndex + 1 : 2; // Reserve 0 & 1 for Hot/Cold vaults
            }

            // Treasury Master Seed Phrase is strictly stored securely in local .env
            const mnemonic = process.env.HD_MASTER_MNEMONIC;
            if (!mnemonic) {
                return res.status(500).json({ error: "Treasury Master Seed is critically missing from backend .env configurations!" });
            }
            
            // Map bridging coins to backend SDK chains
            let chain = 'ETH';
            if (payCoin === 'USDT_TRC20' || payCoin === 'USDT' || payCoin === 'TRX') chain = 'TRON'; 
            if (payCoin === 'USDT_BEP20' || payCoin === 'BNB') chain = 'BNB';
            if (payCoin === 'USDT_ERC20' || payCoin === 'ETH') chain = 'ETH';
            if (payCoin === 'BTC') chain = 'BTC';
            if (payCoin === 'SOL') chain = 'SOL';

            const externalUrl = process.env.EXTERNAL_WALLET_URL || 'http://localhost:4001';
            const walletRes = await axios.post(`${externalUrl}/api/wallet/address/index`, {
                mnemonic,
                chain,
                index: finalIndex
            });
            
            depositAddress = walletRes.data.wallet.address;
        }

        // 3. Immutably Save Swap to the Database with Fee Tracking
        const newOrder = new SwapOrder({
            orderId: crypto.randomUUID(),
            derivationIndex: finalIndex,
            username,
            fromCurrency: payCoin,
            toCurrency: receiveCoin,
            amountExpected: parseFloat(amount),
            amountToPayout: parseFloat(quote.receiveAmount),
            exchangeRate: parseFloat(quote.exchangeRate),
            feeProfit: parseFloat(quote.platformFeeAmount || 0),
            feeProfitUSD: parseFloat(quote.platformFeeAmount || 0) * (quote.oraclePrices[receiveCoin === 'USDT' ? 'USDT_TRC20' : receiveCoin] || 1),
            depositAddress,
            depositMemo,
            targetPayoutWallet: destinationAddress,
            status: 'PENDING'
        });

        await newOrder.save();

        return res.status(200).json({
            success: true,
            orderId: newOrder.orderId,
            depositAddress,
            depositMemo,
            amountExpected: newOrder.amountExpected,
            amountToPayout: newOrder.amountToPayout,
            exchangeRate: newOrder.exchangeRate,
            expiresAt: newOrder.expiresAt,
            status: newOrder.status
        });

    } catch (error) {
        console.error("Initiate Swap Error:", error);
        return res.status(500).json({ error: error.response?.data?.error || "Failed to mathematically initialize swap execution" });
    }
};

exports.getSwapOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await SwapOrder.findOne({ orderId });
        if (!order) return res.status(404).json({ error: "Database Execution: Swap order not found" });
        return res.status(200).json(order);
    } catch (err) {
        return res.status(500).json({ error: "Failed to fetch Swap Pipeline status" });
    }
};

exports.executeOutbound = async (orderId) => {
    try {
        const order = await SwapOrder.findOne({ orderId });
        if (!order || order.status !== 'DEPOSIT_DETECTED') return;

        order.status = 'PROCESSING';
        await order.save();

        if (order.toCurrency === 'HIVE' || order.toCurrency === 'HBD') {
            const sender = process.env.HIVE_SWAP_HOT_WALLET || "sovra.swap";
            const privateKey = dhive.PrivateKey.fromString(process.env.HIVE_SWAP_ACTIVE_KEY);
            
            const op = [
                'transfer',
                {
                    from: sender,
                    to: order.targetPayoutWallet.replace('@', ''),
                    amount: `${order.amountToPayout.toFixed(3)} ${order.toCurrency}`,
                    memo: `Sovraniche Swap Execution: ${order.orderId}`
                }
            ];
            
            const broadcastRes = await client.broadcast.sendOperations([op], privateKey);
            
            order.status = 'COMPLETED';
            if (broadcastRes && broadcastRes.id) {
                order.txHashPayout = broadcastRes.id;
            }
            await order.save();
            console.log(`✅ [Swap Matrix] Successfully executed cross-chain Hive transmission for ${orderId}`);
        } else {
            const mnemonic = process.env.HD_MASTER_MNEMONIC;
            let chain = 'ETH';
            if (order.toCurrency === 'USDT_TRC20' || order.toCurrency === 'USDT' || order.toCurrency === 'TRX') chain = 'TRON';
            if (order.toCurrency === 'USDT_BEP20' || order.toCurrency === 'BNB') chain = 'BNB';
            if (order.toCurrency === 'USDT_ERC20' || order.toCurrency === 'ETH') chain = 'ETH';
            if (order.toCurrency === 'BTC') chain = 'BTC';
            if (order.toCurrency === 'SOL') chain = 'SOL';

            const externalUrl = process.env.EXTERNAL_WALLET_URL || 'http://localhost:4001';
            const walletRes = await axios.post(`${externalUrl}/api/wallet/address/index`, {
                mnemonic,
                chain,
                index: 0
            });
            
            const treasuryWallet = walletRes.data.wallet;
            
            let sendChain = order.toCurrency;
            if (order.toCurrency === 'USDT') sendChain = 'USDT_TRC20';

            const sendRes = await axios.post(`${externalUrl}/api/wallet/send`, {
                chain: sendChain,
                to: order.targetPayoutWallet,
                amount: order.amountToPayout,
                wallet: treasuryWallet
            });

            order.status = 'COMPLETED';
            if (sendRes.data && sendRes.data.transaction && sendRes.data.transaction.hash) {
                order.txHashPayout = sendRes.data.transaction.hash;
            }
            await order.save();
            console.log(`✅ [Swap Matrix] Successfully executed cross-chain EVM transmission for ${orderId}`);
        }
    } catch(err) {
        console.error("Execute Outbound Error:", err?.response?.data || err.message);
        try {
            const failedOrder = await SwapOrder.findOne({ orderId });
            if (failedOrder) {
                failedOrder.status = 'FAILED_PAYOUT';
                await failedOrder.save();
            }
        } catch(e) {}
    }
}

// Nodemon Trigger - Automatically reloads to absorb newly generated .env seed phrases
