const express = require('express');
const { createUser, createHiveAccount, getAllUsers } = require('../contollers/users');
const { transferPoints, getTransactionHistory, getCommunityTransactions } = require('../contollers/transactions');
const { 
    updateUserPoints, 
    getUserPoints, 
    getAllUsersPoints, 
    claimPoints, 
    getUserPointsByCommunity 
} = require('../contollers/points');
const { getPointsHistory } = require('../contollers/pointsHistory');

const router = express.Router();

// User Routes
router.post('/users', createUser);
router.post('/create-hive-account', createHiveAccount);
router.get('/users', getAllUsers);

//Points Route
router.post('/points', updateUserPoints);
router.post('/points/claim', claimPoints);
router.get('/points/:username', getUserPoints);
router.get('/points', getAllUsersPoints);
router.get('/community/:community', getUserPointsByCommunity);

//Transaction Routes
router.post('/transactions/transfer', transferPoints);
router.get('/transactions/history', getTransactionHistory);
router.get('/transactions/community', getCommunityTransactions);

router.get('/points-history/:username', getPointsHistory)

module.exports = router;