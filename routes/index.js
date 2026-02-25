const express = require('express');
const { createUser, createHiveAccount, getAllUsers, getAllBtcUsers, createHiveAccountKc, getUserByUsername } = require('../contollers/users');
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
const { loginUser, registerUser, checkSolBalance } = require('../contollers/offchainUsers');
const { createFreeLightAccount, getAccountStatus } = require('../contollers/btcLightning.js');
const authenticateToken = require("../middleware/auth");
const { cloneRepository, createEnvVariables, checkDirectory, checkEnvFile, runDocker } = require("../contollers/communitySetup")
const { dockerSetupRequest, getDockerSetups, getSingleDockerSetup, confirmDockerRequest, cancelDockerRequest, deleteDockerRequest } = require('../contollers/docker');
const { createBtcMachineAccount, checkBtcBal, getAddressTransactions, createOneBtcAccount, createFreeAccount, generateHiveAccountKeys, checkForBcMachine, updateAccountWithBtcInfo } = require('../contollers/bitcoin');
const loginAdmin = require('../contollers/admin');
const verifyAdmin = require('../middleware/admin');
const { getConfig, saveConfig } = require('../contollers/config');
const { broadcastRelay } = require('../contollers/relay');
const { getMessages, editMessage } = require('../contollers/messages');
const { createStory, getStories } = require('../contollers/stories');

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
router.get('/btc-users', getAllBtcUsers);
router.get('/user/:username', getUserByUsername);

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
router.post('/create-account', createBtcMachineAccount)
router.post('/create-one-btc-account', createOneBtcAccount)
router.post('/create-free-account', createFreeAccount)
router.post('/get-account-keys', generateHiveAccountKeys)
router.get('/btc-balance/:address', checkBtcBal)
router.get('/address-trx/:address', getAddressTransactions)
router.get('/btc-machine/:address', checkForBcMachine)
router.post('/update-account-btc', updateAccountWithBtcInfo);

router.post('/lightning-account', createFreeLightAccount);
router.get("/account-status/:username", getAccountStatus);

/////admin
router.post('/admin/login', loginAdmin)

// Dynamic Config POC
router.get('/config/:domain', getConfig);
router.post('/config', saveConfig);

// Relay for delegated Posting Authority
router.post('/hive/relay', authenticateToken, broadcastRelay);

// Messaging
router.get('/api/messages', getMessages);
router.patch('/api/messages/:id', editMessage);

// Stories
router.get('/api/stories', getStories);
router.post('/api/stories', authenticateToken, createStory);

module.exports = router;