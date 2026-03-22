const P2PAd = require('../models/P2PAd');
const P2POrder = require('../models/P2POrder');
const BankAccount = require('../models/BankAccount');

exports.createAd = async (req, res) => {
    try {
        const { makerId, type, cryptoCurrency, fiatCurrency, price, minLimit, maxLimit, paymentMethods, bankDetails, terms } = req.body;
        
        if (!makerId || !type || !cryptoCurrency || !fiatCurrency || !price || !minLimit || !maxLimit) {
            return res.status(400).json({ success: false, error: 'Missing core liquidity variables' });
        }

        if (type === 'SELL') {
            if (!bankDetails || !bankDetails.bankName || !bankDetails.accountName || !bankDetails.accountNumber) {
                return res.status(400).json({ success: false, error: 'A valid Bank Account is mandatory to publish a SELL liquidity ad.' });
            }
        }

        const totalCryptoAmount = type === 'SELL' ? (Number(maxLimit) / Number(price)) : 0;
        const availableCryptoAmount = totalCryptoAmount;

        const ad = new P2PAd({ makerId, type, cryptoCurrency, fiatCurrency, price, minLimit, maxLimit, totalCryptoAmount, availableCryptoAmount, paymentMethods, bankDetails, terms });
        await ad.save();
        res.status(201).json({ success: true, data: ad });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAds = async (req, res) => {
    try {
        // Aggregating live ads matching criteria (can take query params for filtering later)
        const filters = { status: 'ACTIVE' };
        if (req.query.fiatCurrency) filters.fiatCurrency = req.query.fiatCurrency;
        if (req.query.cryptoCurrency) filters.cryptoCurrency = req.query.cryptoCurrency;
        if (req.query.type) filters.type = req.query.type;

        const ads = await P2PAd.find(filters).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: ads });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getUserAds = async (req, res) => {
    try {
        const ads = await P2PAd.find({ makerId: req.params.username }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: ads });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { adId, makerId, takerId, type, cryptoCurrency, cryptoAmount, fiatCurrency, fiatAmount, price, paymentMethodDetails } = req.body;
        
        const ad = await P2PAd.findById(adId);
        if (!ad) return res.status(404).json({ success: false, error: 'Ad not found' });
        
        if (ad.type === 'SELL') {
            if (ad.availableCryptoAmount < cryptoAmount) {
                return res.status(400).json({ success: false, error: 'Not enough available liquidity securely banked in this Ad' });
            }
            ad.availableCryptoAmount -= Number(cryptoAmount);

            // Recalibrate Fiat bounds seamlessly alongside Crypto shrinkage
            const remainingFiatCapacity = ad.availableCryptoAmount * ad.price;
            if (remainingFiatCapacity < ad.maxLimit) {
                ad.maxLimit = remainingFiatCapacity;
            }
            if (ad.minLimit > ad.maxLimit) {
                ad.minLimit = ad.maxLimit;
            }

            if (ad.availableCryptoAmount <= 0.001 || ad.maxLimit <= 0) {
                ad.status = 'CLOSED';
            }
            await ad.save();
        } else if (ad.type === 'BUY') {
            // Takers are selling to the Merchant. Dynamically deduct the Maker's Fiat Liquidity bounds.
            ad.maxLimit -= Number(fiatAmount);
            
            if (ad.minLimit > ad.maxLimit) {
                ad.minLimit = ad.maxLimit;
            }
            
            if (ad.maxLimit <= 0) {
                ad.status = 'CLOSED';
            }
            await ad.save();
        }

        // Locking the trade timer (15 minutes exactly)
        const deadline = new Date();
        deadline.setMinutes(deadline.getMinutes() + 15);

        const order = new P2POrder({
            adId, makerId, takerId, type, cryptoCurrency, cryptoAmount, fiatCurrency, fiatAmount, price, paymentMethodDetails, paymentDeadline: deadline
        });
        await order.save();
        res.status(201).json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getOrder = async (req, res) => {
    try {
        const order = await P2POrder.findById(req.params.id).populate('adId');
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getUserOrders = async (req, res) => {
    try {
        const orders = await P2POrder.find({
            $or: [{ makerId: req.params.username }, { takerId: req.params.username }]
        }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.closeAd = async (req, res) => {
    try {
        const ad = await P2PAd.findById(req.params.id);
        if (!ad) return res.status(404).json({ success: false, error: 'Ad not found' });
        if (ad.status === 'CLOSED') return res.status(400).json({ success: false, error: 'Ad is already closed' });
        
        // Execute Merchant Auto-Refund BEFORE retaining the DB record state
        if (ad.type === 'SELL' && ad.availableCryptoAmount > 0) {
            const dhive = require('@hiveio/dhive');
            const client = new dhive.Client(['https://api.hive.blog', 'https://api.deathwing.me']);
            const escrowAccount = process.env.P2P_ESCROW_ACCOUNT;
            const escrowKeyStr = process.env.P2P_ESCROW_ACTIVE_KEY;
            
            if (escrowAccount && escrowKeyStr) {
                const escrowKey = dhive.PrivateKey.fromString(escrowKeyStr);
                const amountStr = Number(ad.availableCryptoAmount).toFixed(3) + ' ' + ad.cryptoCurrency;
                try {
                    await client.broadcast.transfer({
                        from: escrowAccount,
                        to: ad.makerId,
                        amount: amountStr,
                        memo: `Sovraniche P2P Refund: Merchant Ad Closed/Deleted (#${ad._id.toString().substring(0,8)})`
                    }, escrowKey);
                    
                    ad.availableCryptoAmount = 0; // safely flushed from the DB tracker
                } catch (bcErr) {
                    console.error('Blockchain Native Refund Failed:', bcErr);
                    return res.status(500).json({ success: false, error: 'Escrow Refund failed. Retain ad manually.' });
                }
            } else {
                console.error('⚠️ [Escrow] Missing .env Keys for Escrow Refund.');
                return res.status(500).json({ success: false, error: 'Critical: Escrow keys missing from backend .env. Refund aborted.' });
            }
        }

        ad.status = 'CLOSED';
        await ad.save();
        res.status(200).json({ success: true, data: ad });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateAd = async (req, res) => {
    try {
        const { price, minLimit, maxLimit, terms, bankDetails, paymentMethods } = req.body;
        const ad = await P2PAd.findById(req.params.id);
        
        if (!ad) return res.status(404).json({ success: false, error: 'Ad not found' });
        if (ad.status === 'CLOSED') return res.status(400).json({ success: false, error: 'Cannot edit a closed Ad' });

        if (price) ad.price = Number(price);
        if (minLimit) ad.minLimit = Number(minLimit);
        if (maxLimit) ad.maxLimit = Number(maxLimit);
        if (terms !== undefined) ad.terms = terms;
        if (bankDetails) ad.bankDetails = bankDetails;
        if (paymentMethods) ad.paymentMethods = paymentMethods;

        await ad.save();
        res.status(200).json({ success: true, data: ad });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.addBankAccount = async (req, res) => {
    try {
        const { username, bankName, accountName, accountNumber } = req.body;
        if (!username || !bankName || !accountName || !accountNumber) {
            return res.status(400).json({ success: false, error: 'Missing core bank details.' });
        }
        const account = new BankAccount({ username, bankName, accountName, accountNumber });
        await account.save();
        res.status(201).json({ success: true, data: account });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getBankAccounts = async (req, res) => {
    try {
        const accounts = await BankAccount.find({ username: req.params.username }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: accounts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteBankAccount = async (req, res) => {
    try {
        const account = await BankAccount.findByIdAndDelete(req.params.id);
        if (!account) return res.status(404).json({ success: false, error: 'Account not found to delete.' });
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const order = await P2POrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        
        if (order.status !== 'CANCELLED') {
            order.status = 'CANCELLED';
            await order.save();
            
            if (order.type === 'SELL') {
                const ad = await P2PAd.findById(order.adId);
                if (ad) {
                    ad.availableCryptoAmount += Number(order.cryptoAmount);
                    if (ad.status === 'CLOSED') ad.status = 'ACTIVE';
                    await ad.save();
                }
            }
        }
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.confirmPayment = async (req, res) => {
    try {
        const order = await P2POrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        
        order.status = 'RELEASING';
        await order.save();
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.completeOrder = async (req, res) => {
    try {
        const order = await P2POrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        
        const dhive = require('@hiveio/dhive');
        const client = new dhive.Client(['https://api.hive.blog', 'https://api.deathwing.me']);

        const escrowAccount = process.env.P2P_ESCROW_ACCOUNT;
        const escrowKeyStr = process.env.P2P_ESCROW_ACTIVE_KEY;

        if (escrowAccount && escrowKeyStr) {
            const escrowKey = dhive.PrivateKey.fromString(escrowKeyStr);
            const receiver = (order.type === 'SELL') ? order.takerId : order.makerId;
            const amountStr = Number(order.cryptoAmount).toFixed(3) + ' ' + order.cryptoCurrency;

            try {
                await client.broadcast.transfer({
                    from: escrowAccount,
                    to: receiver,
                    amount: amountStr,
                    memo: `Sovraniche P2P Settlement #${order._id.toString().substring(0,8)}`
                }, escrowKey);
                console.log(`✅ [Escrow] Successfully Distributed ${amountStr} to @${receiver}`);
            } catch (bcError) {
                console.error('❌ [Escrow] Blockchain release failed:', bcError);
                return res.status(500).json({ success: false, error: 'Blockchain escrow transfer failed: ' + bcError.message });
            }
        } else {
            console.error('⚠️ [Escrow] Missing .env Keys for Escrow Disbursement.');
            return res.status(500).json({ success: false, error: 'Critical: Escrow keys missing from backend .env. Release aborted.' });
        }

        order.status = 'COMPLETED';
        await order.save();
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
