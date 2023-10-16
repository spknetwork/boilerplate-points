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
const { keychainAuth, keysAuth } = require('../contollers/auth');
const { registerCommunity } = require('../contollers/communities');
const  authenticateToken  = require("../middleware/auth");
const { cloneRepository, createEnvVariables, checkDirectory, checkEnvFile, runDocker } = require("../contollers/communitySetup")

const router = express.Router();

//Key login
router.post("/auth/login-key", keysAuth)

//Keychain login
router.get("/auth/login", keychainAuth);

// User Routes
router.post('/users', createUser); //note needed anymore
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
//need checking again
router.get('/transactions/history', getTransactionHistory);
router.get('/transactions/:community', getCommunityTransactions);

//needs checking again
router.get('/points-history/:username', getPointsHistory);

//community setup
router.post('/clone-repo', cloneRepository);
router.post('/create-variables', createEnvVariables);
router.get('/check-directory', checkDirectory);
router.get('/check-env-file', checkEnvFile);
router.get('/run-docker', runDocker);
router.post('/register-community', registerCommunity);

module.exports = router;