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
const { keychainAuth } = require('../contollers/auth');
const  authenticateToken  = require("../middleware/auth")

const router = express.Router();

// User Routes
router.post('/users', createUser); //note needed anymore
router.post('/create-hive-account', createHiveAccount);
router.get('/users', getAllUsers);

//Keychain login
router.get("/auth/login", keychainAuth)

//Points Route
router.post('/points', authenticateToken, updateUserPoints);
router.post('/points/claim', claimPoints);
router.get('/points/:username', authenticateToken, getUserPoints);
router.get('/points', getAllUsersPoints);
router.get('/community/:community', getUserPointsByCommunity);

//Transaction Routes
router.post('/transactions/transfer', authenticateToken,  transferPoints);
router.get('/transactions/history', getTransactionHistory);
router.get('/transactions/community', getCommunityTransactions);

router.get('/points-history/:username', getPointsHistory)

module.exports = router;