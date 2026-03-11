const express = require('express');
const router = express.Router();
const { handleAlchemyWebhook } = require('../contollers/webhook');

// Alchemy Address Activity Webhook
router.post('/alchemy', handleAlchemyWebhook);

module.exports = router;
