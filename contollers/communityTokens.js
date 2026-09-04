const axios = require('axios');
const CommunityConfig = require('../models/CommunityConfig');
const User = require('../models/User');

const WALLET_API = process.env.WALLET_API_URL || 'http://localhost:4001/api/token';
const WALLET_MNEMONIC = process.env.TOKEN_FACTORY_MNEMONIC || process.env.WALLET_MNEMONIC; // The platform's master mnemonic used for gas

exports.deployToken = async (req, res) => {
  try {
    // Only allow admin or the community owner to do this
    const { domain, name, ticker, chain, initialSupply, rpcUrl } = req.body;

    if (!domain || !name || !ticker || !chain || !initialSupply || !rpcUrl) {
      return res.status(400).json({ success: false, msg: 'Missing required parameters for token deployment' });
    }

    if (!WALLET_MNEMONIC) {
      return res.status(500).json({ success: false, msg: 'Platform wallet mnemonic is not configured' });
    }

    // Call the external wallet microservice to deploy the token
    const deployResponse = await axios.post(`${WALLET_API}/deploy`, {
      mnemonic: WALLET_MNEMONIC,
      rpcUrl,
      chain,
      name,
      ticker,
      initialSupply,
    });

    if (deployResponse.data.success) {
      const contractAddress = deployResponse.data.contractAddress;

      // Update the community config with the new token
      await CommunityConfig.findOneAndUpdate(
        { domain },
        {
          nativeTokenTicker: ticker,
          nativeTokenNetwork: chain,
          nativeTokenAddress: contractAddress
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Community Token Deployed and Configured',
        contractAddress,
        deployerAddress: deployResponse.data.deployerAddress,
        transactionHash: deployResponse.data.transactionHash
      });
    } else {
      return res.status(400).json({ success: false, msg: deployResponse.data.message || 'Deployment failed' });
    }

  } catch (error) {
    console.error('deployCommunityToken Error:', error?.response?.data || error.message);
    return res.status(500).json({ success: false, msg: 'Failed to deploy token via wallet service' });
  }
};

exports.relayTokenTransfer = async (req, res) => {
  try {
    const { domain, recipientAddress, amount, rpcUrl } = req.body;
    // req.user comes from the auth middleware
    const username = req.user.username; 

    // Find the community config to know which token to send
    const config = await CommunityConfig.findOne({ domain });
    if (!config || !config.nativeTokenAddress) {
      return res.status(400).json({ success: false, msg: 'Community does not have a native token configured' });
    }

    // Here we would deduct the user's internal points/balance before broadcasting
    // For this MVP, we just relay the intent.
    
    // Call the external wallet microservice
    const relayResponse = await axios.post(`${WALLET_API}/relay`, {
      mnemonic: WALLET_MNEMONIC,
      rpcUrl,
      chain: config.nativeTokenNetwork,
      tokenAddress: config.nativeTokenAddress,
      recipientAddress,
      amount
    });

    if (relayResponse.data.success) {
      return res.status(200).json({
        success: true,
        message: 'Token transfer relayed',
        transactionHash: relayResponse.data.transactionHash,
      });
    } else {
      return res.status(400).json({ success: false, msg: relayResponse.data.message || 'Relay failed' });
    }

  } catch (error) {
    console.error('relayTokenTransfer Error:', error?.response?.data || error.message);
    return res.status(500).json({ success: false, msg: 'Failed to relay token transfer' });
  }
};
