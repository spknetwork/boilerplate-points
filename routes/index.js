const express = require('express');
const { createUser, createHiveAccount, getAllUsers, getAllBtcUsers, createHiveAccountKc, getUserByUsername, syncAddresses } = require('../contollers/users');
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
const { getMessages, editMessage, saveMessage } = require('../contollers/messages');
const { createStory, getStories, getOnchainStories, getStoryContainer, recordStoryTip } = require('../contollers/stories');
const { createShort, getShorts, getShortsContainer, recordTip } = require('../contollers/shorts');
const p2pController = require('../contollers/p2p');

const { askAI } = require('../contollers/ai');

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
const { awardPoints, getBalance, getLedger, claimPoints, transferPoints } = require('../contollers/newPoints');
router.post('/api/v1/points/award', authenticateToken, awardPoints);
router.post('/api/v1/points/claim', authenticateToken, claimPoints);
router.get('/api/v1/points/balance/:username/:communityId', getBalance);
router.get('/api/v1/points/ledger/:username/:communityId', getLedger);

//Transaction Routes
router.post('/transactions/transfer', authenticateToken, transferPoints);
// Legacy routes below were removed as they are unused or replaced by api/v1/points/ledger
// router.get('/transactions/history', getTransactionHistory);
// router.get('/transactions/:community', getCommunityTransactions);

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
router.post('/api/messages', saveMessage);
router.patch('/api/messages/:id', editMessage);

// Stories (offchain)
router.get('/api/stories', getStories);
router.post('/api/stories', authenticateToken, createStory);
// Stories (onchain — Hive blockchain)
router.get('/api/stories/onchain', getOnchainStories);
// Get today's container (and create if not exists) before frontend onchain broadcast
router.get('/api/stories/container', getStoryContainer);
router.put('/api/stories/:id/tip', recordStoryTip);


// Shorts (offchain + onchain reference)
router.get('/api/shorts', getShorts);
router.post('/api/shorts', authenticateToken, createShort);
router.get('/api/shorts/container', getShortsContainer);
router.put('/api/shorts/:id/tip', recordTip);

// P2P Marketplace Routes
router.post('/api/p2p/ads', p2pController.createAd);
router.get('/api/p2p/ads', p2pController.getAds);
router.get('/api/p2p/ads/user/:username', p2pController.getUserAds);

router.post('/api/p2p/orders', p2pController.createOrder);
router.get('/api/p2p/orders/user/:username', p2pController.getUserOrders);
router.get('/api/p2p/orders/:id', p2pController.getOrder);
router.put('/api/p2p/orders/:id/cancel', p2pController.cancelOrder);
router.put('/api/p2p/orders/:id/confirm', p2pController.confirmPayment);
router.put('/api/p2p/orders/:id/complete', p2pController.completeOrder);
router.put('/api/p2p/ads/:id/close', p2pController.closeAd);
router.put('/api/p2p/ads/:id', p2pController.updateAd);

router.post('/api/p2p/bank-accounts', p2pController.addBankAccount);
router.get('/api/p2p/bank-accounts/:username', p2pController.getBankAccounts);
router.delete('/api/p2p/bank-accounts/:id', p2pController.deleteBankAccount);

// AI Assistant 
router.post("/api/ai/ask", askAI);
module.exports = router;