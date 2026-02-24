const Message = require('../models/Message');

/**
 * Get message history for a user
 * Query params: account, otherUser (optional), limit
 */
const getMessages = async (req, res) => {
    try {
        const { account, otherUser, limit = 50 } = req.query;

        if (!account) {
            return res.status(400).json({ success: false, error: "Account parameter is required" });
        }

        let query;
        if (otherUser) {
            // Fetch specific conversation
            query = {
                $or: [
                    { from: account, to: otherUser },
                    { from: otherUser, to: account }
                ]
            };
        } else {
            // Fetch all messages for the account
            query = {
                $or: [
                    { from: account },
                    { to: account }
                ]
            };
        }

        const messages = await Message.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        return res.json({ success: true, messages });
    } catch (error) {
        console.error("GetMessages Error:", error.message);
        return res.status(500).json({ success: false, error: "Failed to fetch messages" });
    }
};

/**
 * Edit an existing message
 * PATCH /api/messages/:id
 * Body: { account, newMessage }
 */
const editMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { account, newMessage } = req.body;

        if (!account || !newMessage) {
            return res.status(400).json({ success: false, error: "account and newMessage are required" });
        }

        const message = await Message.findById(id);
        if (!message) {
            return res.status(404).json({ success: false, error: "Message not found" });
        }

        if (message.from !== account) {
            return res.status(403).json({ success: false, error: "You can only edit your own messages" });
        }

        message.message = newMessage;
        message.edited = true;
        message.editedAt = new Date();
        await message.save();

        return res.json({ success: true, message });
    } catch (error) {
        console.error("EditMessage Error:", error.message);
        return res.status(500).json({ success: false, error: "Failed to edit message" });
    }
};

module.exports = { getMessages, editMessage };
