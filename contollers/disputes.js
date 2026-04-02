const P2POrder = require('../models/P2POrder');
const P2PAd = require('../models/P2PAd');
const dhive = require('@hiveio/dhive');

exports.getDisputes = async (req, res) => {
    try {
        const disputes = await P2POrder.find({ 
            $or: [
                { status: 'DISPUTED' },
                { wasDisputed: true }
            ]
        }).populate('adId').sort({ updatedAt: -1 });
        res.json({ success: true, disputes });
    } catch(err) {
        console.error("Failed to fetch disputes:", err);
        res.status(500).json({ error: "Failed to fetch disputes" });
    }
};

exports.resolveDispute = async (req, res) => {
    try {
        const { orderId, resolution } = req.body; // resolution: 'RELEASE_TO_BUYER' | 'REFUND_TO_SELLER'
        const order = await P2POrder.findById(orderId).populate('adId');
        
        if (!order || order.status !== 'DISPUTED') {
            return res.status(400).json({ success: false, error: "Invalid order or not in DISPUTED status" });
        }

        const escrowAccount = process.env.P2P_ESCROW_ACCOUNT;
        const escrowKeyStr = process.env.P2P_ESCROW_ACTIVE_KEY;

        if (!escrowAccount || !escrowKeyStr) {
             return res.status(500).json({ success: false, error: "Critical: Admin Escrow keys missing from .env" });
        }

        // Identify the exact Buyer and Seller based on Ad Type mathematically
        const buyer = (order.type === 'SELL') ? order.takerId : order.makerId;
        const seller = (order.type === 'SELL') ? order.makerId : order.takerId;

        const targetAddress = (resolution === 'RELEASE_TO_BUYER') ? buyer : seller;
        
        const client = new dhive.Client(['https://api.hive.blog', 'https://api.deathwing.me']);
        const escrowKey = dhive.PrivateKey.fromString(escrowKeyStr);
        const amountStr = Number(order.cryptoAmount).toFixed(3) + ' ' + order.cryptoCurrency;

        try {
            await client.broadcast.transfer({
                from: escrowAccount,
                to: targetAddress,
                amount: amountStr,
                memo: `Sovraniche Admin Judicial Ruling: Dispute #${order._id.toString().substring(0,8)} Resolved`
            }, escrowKey);

            // Structurally update Database
            if (resolution === 'RELEASE_TO_BUYER') {
                order.status = 'COMPLETED';
            } else {
                order.status = 'CANCELLED';
                // Ad Restitution mathematically handled natively just like standard user cancellation
                if (order.adId) {
                     order.adId.availableCryptoAmount += Number(order.cryptoAmount);
                     if (order.adId.status === 'CLOSED') order.adId.status = 'ACTIVE';
                     await order.adId.save();
                }
            }
            order.disputeResolvedBy = 'ADMIN';
            await order.save();
            return res.json({ success: true, data: order });

        } catch (bcError) {
             console.error("Judicial Broadcast Error:", bcError);
             return res.status(500).json({ success: false, error: "Blockchain transfer failed: " + bcError.message });
        }

    } catch (err) {
        console.error("Dispute Resolution Error:", err);
        res.status(500).json({ success: false, error: "Fatal error executing judicial ruling" });
    }
};
