const express = require('express');
const { createUser, getAllUsers } = require('../contollers/users');
const { updateUserPoints, getUserPoints, getAllUsersPoints, claimPoints } = require('../contollers/points');
const router = express.Router();

// User Routes
router.post('/users', createUser);
router.get('/users', getAllUsers);

//Points Route
router.post('/points', updateUserPoints);
router.post('/points/claim', claimPoints);
router.get('/points/:username', getUserPoints);
router.get('/points', getAllUsersPoints);

module.exports = router;