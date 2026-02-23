const axios = require('axios');
require('dotenv').config();

// Function to check if a BTC address holds a specific NFT or asset
async function checkBTCMachineOwnership(address) {
  try {
    // Construct the API URL with the provided Bitcoin address
    const apiUrl = `https://api-mainnet.magiceden.dev/v2/ord/btc/runes/wallet/activities/${address}`;

    // Make the request to the API with the Authorization header
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.MAGIC_EDEN_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const assets = response.data;
    console.log(assets);
    // Check if any asset has a rune starting with "MACHINE" and formattedAmount is 777
    const hasBTCMachine = assets.some(asset =>
      asset.rune.startsWith('MACHINE') && asset.formattedAmount === '777'
    );

    return hasBTCMachine;
  } catch (error) {
    console.error('Error fetching or processing data:', error.message);
    throw error;
  }
}

const getBitcoinMainnetBalance = async (btcAddress) => {
  try {
    const response = await axios.get(`https://blockstream.info/api/address/${btcAddress}`);

    const { funded_txo_sum, spent_txo_sum } = response.data.chain_stats;

    const btcBalance = funded_txo_sum - spent_txo_sum;

    const btcBalanceInBTC = btcBalance / 100000000;

    return btcBalanceInBTC;
  } catch (error) {
    console.error("Error fetching Bitcoin Mainnet balance:", error);
    throw error;
  }
};

const getBitcoinAddressTransactions = async (address) => {
  try {
    const response = await axios.get(`https://blockstream.info/api/address/${address}/txs`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

module.exports = { checkBTCMachineOwnership, getBitcoinMainnetBalance, getBitcoinAddressTransactions };
