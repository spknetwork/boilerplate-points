const axios = require('axios');
const SwapOrder = require('../models/SwapOrder');

exports.getTreasuryBalances = async (req, res) => {
    try {
        const mnemonic = process.env.HD_MASTER_MNEMONIC;
        if (!mnemonic) return res.status(500).json({ error: "Master Mnemonic missing from .env" });

        // Hardcode the core operational chains for the Admin Dashboard
        const chains = ['BTC', 'ETH', 'SOL', 'TRON', 'BNB', 'USDT_TRC20', 'USDT_BEP20', 'USDT_ERC20'];
        const hotWallet = {};
        const feeVault = {};
        const p2pEscrow = {};

        // Helper to programmatically derive all addresses recursively for a specific Hierarchical Deterministic index
        const buildWalletMap = async (targetIndex) => {
             const map = {};
             for (const chain of chains) {
                 try {
                     const deriveRes = await axios.post(`${process.env.EXTERNAL_WALLET_URL || 'http://localhost:4001'}/api/wallet/address/index`, { mnemonic, chain, index: targetIndex });
                     if (deriveRes.data.success && deriveRes.data.wallet) {
                         map[chain] = deriveRes.data.wallet;
                     }
                 } catch (e) {
                     console.error(`Derivation Error [Chain: ${chain}, Index: ${targetIndex}]:`, e.message);
                 }
             }
             return map;
        };

        // 1. Derive wallets for Index 0 (Hot) and Index 1 (Fees)
        const hotWalletMap = await buildWalletMap(0);
        const feeVaultMap = await buildWalletMap(1);

        // 2. Fetch Live Blockchain Balances directly from the Ba-external-wallet oracle
        const hotInfo = await axios.post(`${process.env.EXTERNAL_WALLET_URL || 'http://localhost:4001'}/api/wallet/info`, { wallets: hotWalletMap });
        const feeInfo = await axios.post(`${process.env.EXTERNAL_WALLET_URL || 'http://localhost:4001'}/api/wallet/info`, { wallets: feeVaultMap });

        // 3. Map arrays into clean objects mapped by Chain
        if (hotInfo.data && hotInfo.data.walletInfo) {
            hotInfo.data.walletInfo.forEach(v => {
                hotWallet[v.chain] = { balance: v.balance, usdValue: v.usdValue, address: v.address, price: v.price };
            });
        }

        if (feeInfo.data && feeInfo.data.walletInfo) {
            feeInfo.data.walletInfo.forEach(v => {
                feeVault[v.chain] = { balance: v.balance, usdValue: v.usdValue, address: v.address, price: v.price };
            });
        }

        // 4. Inject Native Hive Balances (RPC Polling)
        const hiveHot = process.env.HIVE_SWAP_HOT_WALLET || 'sovra.swap';
        const hiveFee = process.env.HIVE_FEE_VAULT || 'sovra.kol';
        const hiveP2P = process.env.HIVE_P2P_FEE_VAULT || 'sovra.p2kol';
        const hiveEscrow = process.env.P2P_ESCROW_ACCOUNT || 'sovra.escrow';

        if (hiveHot || hiveFee || hiveP2P || hiveEscrow) {
            try {
                // De-duplicate array natively to prevent double-querying the exact same Hive RPC node
                const accountsToFetch = [...new Set([hiveHot, hiveFee, hiveP2P, hiveEscrow].filter(Boolean))];
                
                const hiveRes = await axios.post("https://api.hive.blog", {
                    jsonrpc: "2.0",
                    method: "condenser_api.get_accounts",
                    params: [accountsToFetch],
                    id: 1
                });
                
                // Fetch HIVE & HBD price from CoinGecko silently
                let hivePrice = 0;
                let hbdPrice = 1; // Logical fallback for stablecoin peg
                try {
                    const cg = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=hive,hive_dollar&vs_currencies=usd");
                    if (cg.data?.hive?.usd) hivePrice = cg.data.hive.usd;
                    if (cg.data?.hive_dollar?.usd) hbdPrice = cg.data.hive_dollar.usd;
                } catch(e) {}

                if (hiveRes.data && hiveRes.data.result) {
                    hiveRes.data.result.forEach(acc => {
                        const balNum = parseFloat(acc.balance.split(" ")[0]);
                        const hbdNum = parseFloat(acc.hbd_balance.split(" ")[0]);
                        
                        if (acc.name === hiveHot) {
                            hotWallet['HIVE-SWAP'] = { balance: balNum, usdValue: balNum * hivePrice, address: acc.name, price: hivePrice };
                            hotWallet['HBD-SWAP']  = { balance: hbdNum, usdValue: hbdNum * hbdPrice, address: acc.name, price: hbdPrice };
                        }
                        if (acc.name === hiveFee) {
                            feeVault['HIVE-SWAP'] = { balance: balNum, usdValue: balNum * hivePrice, address: acc.name, price: hivePrice };
                            feeVault['HBD-SWAP']  = { balance: hbdNum, usdValue: hbdNum * hbdPrice, address: acc.name, price: hbdPrice };
                        }
                        if (acc.name === hiveP2P) {
                            feeVault['HIVE-P2P'] = { balance: balNum, usdValue: balNum * hivePrice, address: acc.name, price: hivePrice };
                            feeVault['HBD-P2P']  = { balance: hbdNum, usdValue: hbdNum * hbdPrice, address: acc.name, price: hbdPrice };
                        }
                        if (acc.name === hiveEscrow) {
                            p2pEscrow['HIVE-ESCROW'] = { balance: balNum, usdValue: balNum * hivePrice, address: acc.name, price: hivePrice };
                            p2pEscrow['HBD-ESCROW']  = { balance: hbdNum, usdValue: hbdNum * hbdPrice, address: acc.name, price: hbdPrice };
                        }
                    });
                }
            } catch (e) {
                console.error("Hive RPC Integration Error:", e.message);
            }
        }

        res.json({ success: true, hotWallet, feeVault, p2pEscrow });
    } catch (err) {
        console.error("Treasury Balance Fatal Error:", err);
        res.status(500).json({ error: "Failed to cleanly aggregate Treasury analytics from the Oracle nodes" });
    }
};

exports.getGlobalSwaps = async (req, res) => {
    try {
        const swaps = await SwapOrder.find().sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, swaps });
    } catch(err) {
        console.error("Swap Fetch Fatal Error:", err);
        res.status(500).json({ error: "Failed to scrape Swap ledgers from the database" });
    }
};

const swapController = require('./swap');

exports.retrySwap = async (req, res) => {
    try {
        const { id } = req.params;
        const swap = await SwapOrder.findOne({ orderId: id });
        if (!swap) return res.status(404).json({ error: "Swap Intelligence Order not found" });

        const allowedStates = ['FAILED_PAYOUT', 'PENDING', 'FAILED', 'DEPOSIT_DETECTED'];
        if (!allowedStates.includes(swap.status)) {
            return res.status(400).json({ error: "Swap is mathematically locked and not in a retryable state" });
        }

        // Programmatically push it back into the active bridge pipeline
        swap.status = 'DEPOSIT_DETECTED';
        await swap.save();

        // Fire-and-forget payload override
        swapController.executeOutbound(swap.orderId).catch(e => console.error("Override trace failed:", e));

        res.json({ success: true, message: "Outbound execution re-triggered computationally.", swap });
    } catch(err) {
        console.error("Retry Swap Error:", err);
        res.status(500).json({ error: "Failed to manually override execution matrix" });
    }
};

exports.getProfitStats = async (req, res) => {
    try {
        // Aggregate feeProfit for all COMPLETED orders, grouped by toCurrency
        const stats = await SwapOrder.aggregate([
            { $match: { status: 'COMPLETED' } },
            { $group: {
                _id: "$toCurrency",
                totalProfit: { $sum: "$feeProfit" },
                totalProfitUSD: { $sum: "$feeProfitUSD" },
                count: { $sum: 1 }
            }},
            { $sort: { totalProfitUSD: -1 } }
        ]);

        res.json({ success: true, stats });
    } catch(err) {
        console.error("Profit Stats Error:", err);
        res.status(500).json({ error: "Failed to aggregate profit analytics" });
    }
};

exports.sweepProfits = async (req, res) => {
    try {
        const { chain, amount, toAddress } = req.body;

        if (!chain || !amount || !toAddress) {
            return res.status(400).json({ error: "Missing parameters: chain, amount, and toAddress are required" });
        }

        // Proxy the sweep request to Ba-external-wallet (keeps mnemonic on server-side)
        const externalUrl = process.env.EXTERNAL_WALLET_URL || 'http://localhost:4001';
        const sweepRes = await axios.post(`${externalUrl}/api/wallet/sweep`, {
            chain,
            amount: parseFloat(amount),
            toAddress
            // Mnemonic is loaded from HD_MASTER_MNEMONIC in Ba-external-wallet's .env
        });

        if (sweepRes.data?.success) {
            return res.json({
                success: true,
                transaction: sweepRes.data.transaction,
                message: `Swept ${amount} ${chain} to ${toAddress}`
            });
        } else {
            throw new Error(sweepRes.data?.message || "Sweep failed at oracle level");
        }
    } catch(err) {
        console.error("Sweep Profits Proxy Error:", err?.response?.data || err.message);
        res.status(500).json({ error: err?.response?.data?.message || err.message || "Failed to execute sweep" });
    }
};

