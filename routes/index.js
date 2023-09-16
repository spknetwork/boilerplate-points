const express = require('express');
const { createUser, getAllUsers } = require('../contollers/users');
const { transferPoints, getTransactionHistory, getCommunityTransactions } = require('../contollers/transactions');
const { 
    updateUserPoints, 
    getUserPoints, 
    getAllUsersPoints, 
    claimPoints, 
    getUserPointsByCommunity 
} = require('../contollers/points');

const router = express.Router();

// User Routes
router.post('/users', createUser);
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

module.exports = router;