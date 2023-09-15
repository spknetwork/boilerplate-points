const express = require('express');
const { createUser, getAllUsers } = require('../contollers/users');
const { updateUserPoints, getUserPoints, getAllUsersPoints } = require('../contollers/points');
const router = express.Router();

// User Routes
router.post('/users', createUser);
router.get('/users', getAllUsers);

//Points Routes
router.post('/points', updateUserPoints);
router.get('/points/:username', getUserPoints);
router.get('/points', getAllUsersPoints);

module.exports = router;