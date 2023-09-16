const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Point = require('../models/Point');

const transferPoints = async (req, res) => {
    try {
      const { senderUsername, receiverUsername, community, amount } = req.body;
  
      if (!senderUsername || !receiverUsername || !community || !amount || amount <= 0) {
        return res.status(400).json({
          message: 'Invalid request parameters',
        });
      }
  
      const senderUser = await User.findOne({ username: senderUsername });
  
      const receiverUser = await User.findOne({ username: receiverUsername });
  
      if (!senderUser || !receiverUser) {
        return res.status(404).json({
          message: 'Sender or receiver user not found',
        });
      }
  
      const senderPointsRecord = await Point.findOne({ user: senderUser._id, communityName: community });
  
      if (!senderPointsRecord || senderPointsRecord.pointsBalance < amount) {
        return res.status(400).json({
          message: 'Sender does not have enough points to transfer',
        });
      }
  
      senderPointsRecord.pointsBalance -= amount;
  
      const receiverPointsRecord = await Point.findOne({ user: receiverUser._id, communityName: community });
  
      if (!receiverPointsRecord) {
        return res.status(404).json({
          message: 'Receiver does not have a points record for this community',
        });
      }
  
      receiverPointsRecord.pointsBalance += parseFloat(amount);
  
      const transaction = new Transaction({
        sender: senderUser._id,
        receiver: receiverUser._id,
        communityName: community,
        pointsTransferred: amount,
      });
  
      await transaction.save();
      await senderPointsRecord.save();
      await receiverPointsRecord.save();
  
      res.status(200).json({
        message: 'Points transferred successfully',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Something went wrong on our end',
      });
    }
};

const getTransactionHistory = async (req, res) => {
    try {
      const { username, community } = req.query;
  
      if (!username || !community) {
        return res.status(400).json({
          message: 'Missing required parameters: username or community',
        });
      }
  
      const user = await User.findOne({ username });
  
      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        });
      }
  
      const transactions = await Transaction.find({
        $or: [{ sender: user._id }, { receiver: user._id }],
        communityName: community,
      }).sort({ createdAt: -1 });
  
      const transactionDetails = [];
  
      for (const transaction of transactions) {
        const senderUser = await User.findById(transaction.sender);
        const receiverUser = await User.findById(transaction.receiver);
  
        transactionDetails.push({
          trx_id: transaction._id,
          sender: senderUser ? senderUser.username : 'Unknown',
          receiver: receiverUser ? receiverUser.username : 'Unknown',
          communityName: transaction.communityName,
          pointsTransferred: transaction.pointsTransferred,
          createdAt: transaction.created_at,
        });
      }
  
      res.status(200).json({
        message: 'Transaction history fetched successfully',
        data: {
          transactions: transactionDetails,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Something went wrong on our end',
      });
    }
};

const getCommunityTransactions = async (req, res) => {
    try {
      const { community } = req.query;
  
      if (!community) {
        return res.status(400).json({
          message: 'Missing required parameter: community',
        });
      }
  
      const transactions = await Transaction.find({ communityName: community });
  
      const transactionDetails = [];
  
      for (const transaction of transactions) {
        const senderUser = await User.findById(transaction.sender);
        const receiverUser = await User.findById(transaction.receiver);
  
        transactionDetails.push({
          transactionId: transaction._id,
          sender: senderUser ? senderUser.username : 'Unknown',
          receiver: receiverUser ? receiverUser.username : 'Unknown',
          communityName: transaction.communityName,
          pointsTransferred: transaction.pointsTransferred,
          createdAt: transaction.createdAt,
        });
      }
  
      res.status(200).json({
        message: 'Transaction history fetched successfully',
        data: {
          transactions: transactionDetails,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: 'Something went wrong on our end',
      });
    }
  };
  
module.exports = { transferPoints, getTransactionHistory, getCommunityTransactions };
