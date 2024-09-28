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
const { dockerSetupRequest, getDockerSetups, getSingleDockerSetup, confirmDockerRequest, cancelDockerRequest, deleteDockerRequest } = require('../contollers/docker');
const { createAccount } = require('../contollers/bitcoin');
const loginAdmin = require('../contollers/admin');
const verifyAdmin = require('../middleware/admin');

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
router.post('/platform-setup', dockerSetupRequest);
router.get('/docker-setup', getDockerSetups);
router.get('/docker-setup/:id', getSingleDockerSetup);
///////admin actions docker set up
router.put('/platform-setup/confirm/:id', verifyAdmin, confirmDockerRequest);
router.put('/platform-setup/cancel/:id', verifyAdmin, cancelDockerRequest);
router.delete('/platform-setup/delete/:id', verifyAdmin, deleteDockerRequest);

//Points Route
router.post('/points', authenticateToken, updateUserPoints);
router.post('/points/claim', authenticateToken, claimPoints);
router.get('/points', getUserPoints);
router.get('/points/:all', getAllUsersPoints);
router.get('/community/:id', getUserPointsByCommunity);

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


/////////bitcoin
router.post('/create-account', createAccount)


/////admin
router.post('/admin/login',loginAdmin)

module.exports = router;