const express = require('express');
const { createUser, createHiveAccount, getAllUsers, createHiveAccountKc } = require('../contollers/users');
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
const { loginUser, registerUser, checkSolBalance} = require('../contollers/offchainUsers');
const  authenticateToken  = require("../middleware/auth");
const { cloneRepository, createEnvVariables, checkDirectory, checkEnvFile, runDocker } = require("../contollers/communitySetup")
const { dockerSetup } = require('../contollers/docker');

const router = express.Router();

//Key login
router.post("/auth/login-key", keysAuth)

//Keychain login
router.get("/auth/login", keychainAuth);
router.get("/sol-bal/:address", checkSolBalance);

//registerKeychain
router.post("/signup-keychain", createHiveAccountKc);


// User Routes
router.post('/users', createUser); //not needed anymore
router.post('/offchain-users/register', registerUser);
router.post('/offchain-users/login', loginUser); //not needed anymore
router.post('/create-hive-account', createHiveAccount);
router.get('/users', getAllUsers);

//docker setup
router.post('/docker-setup', dockerSetup);

//Points Route
router.post('/points', authenticateToken, updateUserPoints);
router.post('/points/claim', authenticateToken, claimPoints);
router.get('/points', getUserPoints);
router.get('/points/:all', getAllUsersPoints);
router.get('/community/:community', getUserPointsByCommunity);

//Transaction Routes
router.post('/transactions/transfer', transferPoints);
//need checking again
router.get('/transactions/history', getTransactionHistory);
router.get('/transactions/:community', getCommunityTransactions);

//needs checking again
router.get('/points-history/:username/:community', getPointsHistory);

//community setup
router.post('/clone-repo', cloneRepository);
router.post('/create-variables', createEnvVariables);
router.get('/check-directory', checkDirectory);
router.get('/check-env-file', checkEnvFile);
router.get('/run-docker', runDocker);
router.post('/register-community', registerCommunity);

module.exports = router;