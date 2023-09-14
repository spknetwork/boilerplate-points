const express = require('express');
const { createUser } = require('../contollers/users');
const { updateUserPoints, getUserPoints } = require('../contollers/points');
const router = express.Router();

// User Routes
router.post('/users', createUser);

//Points Routes
router.post('/points', updateUserPoints);
router.get('/points/:username', getUserPoints);

module.exports = router;