const bitcoinMessage = require("bitcoinjs-message");
const axios = require("axios")
const dhive = require('@hiveio/dhive');
const fs = require('fs').promises;
require('dotenv').config();
const client = require("./../hive/client")
const BitcoinMachines = require('../models/BitcoinMachines');

// Function to check if a BTC address holds a specific NFT or asset
async function checkBTCMachineOwnership(address) {
    try {
        // Construct the API URL with the provided Bitcoin address
        const apiUrl = `https://api-mainnet.magiceden.dev/v2/ord/btc/runes/wallet/activities/${address}`;

        // Make the request to the API with the Authorization header
        const response = await axios.get(apiUrl, {
            headers: {
                'Authorization': 'Bearer 3d0a7719-4280-45cc-807c-335eada01fc8',
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

const BTC_ADDRESSES_FILE = 'btc_addresses.json';

// Function to verify a Bitcoin message signature
function verifySignature(address, message, signature) {
    try {
        return bitcoinMessage.verify(message, address, signature);
    } catch (error) {
        throw new Error('Signature verification failed');
    }
}

// Function to read BTC addresses from file
async function readBTCAddresses() {
    try {
        const data = await fs.readFile(BTC_ADDRESSES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return an empty array
            return [];
        }
        throw error;
    }
}

// Function to write BTC addresses to file
async function writeBTCAddresses(addresses) {
    await fs.writeFile(BTC_ADDRESSES_FILE, JSON.stringify(addresses, null, 2));
}

// Endpoint to create a new account using claimed accounts with signature verification
const createAccount = async (req, res) => {
    const { username, address, message, signature } = req.body;

    if (!username || !address || !message || !signature) {
        return res.status(400).json({ error: 'Username, address, message, and signature are required' });
    }

    try {
        // Verify the Bitcoin message signature
        const isValid = verifySignature(address, message, signature);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Check if the BTC address has already been used
        // const existingRecord = await BitcoinMachines.findOne({ bitcoinAddress: address });
        // if (existingRecord) {
        //     return res.status(400).json({ error: 'This BTC address has already been used to create an account' });
        // }

        // Check if the BTC address has already been used
        // const usedAddresses = await readBTCAddresses();
        // if (usedAddresses.includes(address)) {
        //     return res.status(400).json({ error: 'This BTC address has already been used to create an account' });
        // }

        const ownsBTCMachine = await checkBTCMachineOwnership(address);
        // if (!ownsBTCMachine) {
        //      return res.status(400).json({ error: 'No Bitcoin Machine' });
        // }

        const accountCreator = process.env.HIVE_ACCOUNT_CREATOR;
        const activeKey = dhive.PrivateKey.fromString(process.env.HIVE_ACCOUNT_CREATOR_ACTIVE_KEY);

        const ownerKey = dhive.PrivateKey.fromLogin(username, 'owner', 'posting');
        const activeKeyNew = dhive.PrivateKey.fromLogin(username, 'active', 'posting');
        const postingKey = dhive.PrivateKey.fromLogin(username, 'posting', 'posting');
        const memoKey = dhive.PrivateKey.fromLogin(username, 'memo', 'posting');

        const publicOwnerKey = ownerKey.createPublic().toString();
        const publicActiveKey = activeKeyNew.createPublic().toString();
        const publicPostingKey = postingKey.createPublic().toString();
        const publicMemoKey = memoKey.createPublic().toString();

        const createAccount = await client.broadcast.sendOperations(
            [
                [
                    'create_claimed_account',
                    {
                        creator: accountCreator,
                        new_account_name: username,
                        owner: {
                            weight_threshold: 1,
                            account_auths: [],
                            key_auths: [[publicOwnerKey, 1]],
                        },
                        active: {
                            weight_threshold: 1,
                            account_auths: [],
                            key_auths: [[publicActiveKey, 1]],
                        },
                        posting: {
                            weight_threshold: 1,
                            account_auths: [],
                            key_auths: [[publicPostingKey, 1]],
                        },
                        memo_key: publicMemoKey,
                        json_metadata: '',
                        extensions: [],
                    },
                ],
            ],
            activeKey
        );

        console.log(createAccount)

        // // Save the BTC address to the JSON file
        // usedAddresses.push({
        //     bitcoinAddress: address + Date.now(),
        //     hiveAccount: username,
        //     createdAt: Date.now()
        // });
        // await writeBTCAddresses(usedAddresses);

        const newMachine = new BitcoinMachines({
            username,
            bitcoinAddress: address,
            signature,
            ownsBTCMachine,
        });

        await newMachine.save();

        res.json({
            success: true,
            result: createAccount,
            keys: {
                owner: ownerKey.toString(),
                active: activeKeyNew.toString(),
                posting: postingKey.toString(),
                memo: memoKey.toString(),
            }
        });
    } catch (error) {
        console.log("error.....", error.message)
        res.status(500).json({ error: error.message });
    }
};

module.exports = { checkBTCMachineOwnership, createAccount };
