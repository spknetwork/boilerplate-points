const bitcoinMessage = require("bitcoinjs-message");
const axios = require("axios")
const dhive = require('@hiveio/dhive');
const { PrivateKey } = require('@hiveio/dhive');
const { randomBytes } = require('crypto');
const fs = require('fs').promises;
require('dotenv').config();
const client = require("./../hive/client")
const BitcoinMachines = require('../models/BitcoinMachines');
const User = require("../models/User.js");
const { getBitcoinMainnetBalance, getBitcoinAddressTransactions } = require("../utils/bitcoin.js")

const getPrivateKeys = (username, password) => {
    const roles = ["owner", "active", "posting", "memo"];
    const privKeys = {
        owner: "",
        active: "",
        posting: "",
        memo: "",
        ownerPubkey: "",
        activePubkey: "",
        postingPubkey: "",
        memoPubkey: ""
    };

    roles.forEach((role) => {
        privKeys[role] = PrivateKey.fromLogin(username, password, role).toString();
        privKeys[`${role}Pubkey`] = PrivateKey.from(privKeys[role]).createPublic().toString();
    });

    console.log(privKeys);
    return privKeys;
};

const generatePassword = async (length) => {
    const password = `P${PrivateKey.fromSeed(randomBytes(length).toString("hex")).toString()}`;
    return password;
};

// Function to check if a BTC address holds a specific NFT or asset
async function checkBTCMachineOwnership(address) {
    try {
    
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

// Function to verify a Bitcoin message signature
function verifySignature(address, message, signature) {
    try {
        return bitcoinMessage.verify(message, address, signature);
    } catch (error) {
        throw new Error('Signature verification failed');
    }
}

/////get hive acc keys
const generateHiveAccountKeys = async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: "Username is required to generate keys." });
    }

    try {
        const masterPassword = await generatePassword(63);
        const privKeys = getPrivateKeys(username, masterPassword);

        res.json({
            success: true,
            accountDetails: {
                username,
                owner: privKeys.owner,
                active: privKeys.active,
                posting: privKeys.posting,
                memo: privKeys.memo,
                masterPassword,
                ownerPubkey: privKeys.ownerPubkey,
                activePubkey: privKeys.activePubkey,
                postingPubkey: privKeys.postingPubkey,
                memoPubkey: privKeys.memoPubkey
            }
        });
    } catch (error) {
        console.error("Error generating keys:", error.message);
        res.status(500).json({ error: "An error occurred while generating keys." });
    }
};

// Endpoint to create a new account using claimed accounts with signature verification
const createBtcMachineAccount = async (req, res) => {
    const { username, address, message, signature, accountKeys, ordinalAddress } = req.body;

    if (!username || !address || !message || !signature || !accountKeys || !ordinalAddress) {
        return res.status(400).json({ error: 'Username, address, message, and signature are required' });
    }

    try {
        const balance = await getBitcoinMainnetBalance(address);

        if(balance < 0.00005) {
            return res.status(400).json({ error: 'You must have at least 0.00005btc to get a free account' });
        }

        // Verify the Bitcoin message signature
        const isValid = verifySignature(address, message, signature);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Check if the BTC address has already been used
        const existingRecord = await BitcoinMachines.findOne({ bitcoinAddress: address });
        if (existingRecord) {
            return res.status(400).json({ error: 'This BTC address has already been used to create an account' });
        }

        // Check if the username or BTC address has already been used
        const existingUser = await User.findOne({ 
            $or: [{ username }, { bitcoinAddress: address }]
        });

        if (existingUser) {
            return res.status(400).json({ error: 'This username or BTC address has already been used to create an account' });
        }

        const ownsBTCMachine = await checkBTCMachineOwnership(address);
        // if (!ownsBTCMachine) {
        //      return res.status(400).json({ error: 'No Bitcoin Machine found in the provided address' });
        // }

        const accountCreator = process.env.HIVE_ACCOUNT_CREATOR;
        const activeKey = dhive.PrivateKey.fromString(process.env.HIVE_ACCOUNT_CREATOR_ACTIVE_KEY);

        const publicOwnerKey = accountKeys.ownerPubkey
        const publicActiveKey = accountKeys.activePubkey
        const publicPostingKey = accountKeys.postingPubkey
        const publicMemoKey = accountKeys.memoPubkey

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

        const newUser = new User({
            username,
            bitcoinAddress: address,
            ordinalAddress,
            signature,
            ownsBTCMachine,
        });

        await newUser.save();

        const newBtcUser = new BitcoinMachines({
            username,
            bitcoinAddress: address,
            ordinalAddress,
            signature,
            ownsBTCMachine,
        });

        newBtcUser.save();

        res.json({
            success: true,
            result: createAccount,
            message: "Hive account created succesfully"
            // keys: {
            //     owner: ownerKey.toString(),
            //     active: activeKeyNew.toString(),
            //     posting: postingKey.toString(),
            //     memo: memoKey.toString(),
            // }
        });
    } catch (error) {
        console.log("error.....", error.message)
        res.status(500).json({ error: error.message });
    }
};

const createOneBtcAccount = async (req, res) => {
    const { username, address, message, signature, accountKeys, ordinalAddress } = req.body;
    console.log(req.body)

    if (!username || !address || !message || !signature || !accountKeys || !ordinalAddress) {
        return res.status(400).json({ error: 'Username, address, message, and signature are required' });
    }
    
    try {
        const balance = await getBitcoinMainnetBalance(address);

        if(balance < 0.00005) {
            return res.status(400).json({ error: 'You must have at least 0.00005btc to get a free account' });
        }

        // Verify the Bitcoin message signature
        const isValid = verifySignature(address, message, signature);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Check if the BTC address has already been used
        const existingRecord = await BitcoinMachines.findOne({ bitcoinAddress: address });
        if (existingRecord) {
            return res.status(400).json({ error: 'This BTC address has already been used to create an account' });
        }

        // Check if the username or BTC address has already been used
        const existingUser = await User.findOne({ 
            $or: [{ username }, { bitcoinAddress: address }]
        });

        if (existingUser) {
            return res.status(400).json({ error: 'This username or BTC address has already been used to create an account' });
        }

        const ownsBTCMachine = await checkBTCMachineOwnership(address);
        // if (!ownsBTCMachine) {
        //      return res.status(400).json({ error: 'No Bitcoin Machine found in the provided address' });
        // }

        const accountCreator = process.env.HIVE_ACCOUNT_CREATOR;
        const activeKey = dhive.PrivateKey.fromString(process.env.HIVE_ACCOUNT_CREATOR_ACTIVE_KEY);

        const publicOwnerKey = accountKeys.ownerPubkey
        const publicActiveKey = accountKeys.activePubkey
        const publicPostingKey = accountKeys.postingPubkey
        const publicMemoKey = accountKeys.memoPubkey

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

        const newUser = new User({
            username,
            bitcoinAddress: address,
            ordinalAddress,
            signature,
            ownsBTCMachine,
        });

        await newUser.save();

        const newBtcUser = new BitcoinMachines({
            username,
            bitcoinAddress: address,
            ordinalAddress,
            signature,
            ownsBTCMachine,
        });
        
        newBtcUser.save();

        res.json({
            success: true,
            result: createAccount,
            message: "Hive account created succesfully"
        });
    } catch (error) {
        console.log("error.....", error.message)
        res.status(500).json({ error: error.message });
    }
};

const updateAccountWithBtcInfo = async (req, res) => {
    const { username, address, message, signature, ordinalAddress } = req.body;

    try {
        // Verify the Bitcoin message signature
        const isValid = verifySignature(address, message, signature);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Check if the BTC address or username already exists in the database
        const existingUser = await User.findOne({ 
            $or: [{ username }, { bitcoinAddress: address }]
        });

        // Determine BTC machine ownership
        const ownsBTCMachine = await checkBTCMachineOwnership(address);

        if (existingUser) {
            // Update the existing user
            existingUser.bitcoinAddress = address;
            existingUser.ordinalAddress = ordinalAddress;
            existingUser.signature = signature;
            existingUser.ownsBTCMachine = ownsBTCMachine;
            await existingUser.save();
        } else {
            // Create a new user
            const newUser = new User({
                username,
                bitcoinAddress: address,
                ordinalAddress,
                signature,
                ownsBTCMachine,
            });
            await newUser.save();
        }

        // Check if the BTC address or username exists in the BitcoinMachines collection
        const existingBtcMachine = await BitcoinMachines.findOne({ 
            $or: [{ username }, { bitcoinAddress: address }]
        });

        if (existingBtcMachine) {
            // Update the existing BTC machine entry
            existingBtcMachine.bitcoinAddress = address;
            existingBtcMachine.ordinalAddress = ordinalAddress;
            existingBtcMachine.signature = signature;
            existingBtcMachine.ownsBTCMachine = ownsBTCMachine;
            await existingBtcMachine.save();
        } else {
            // Create a new BTC machine entry
            const newBtcMachine = new BitcoinMachines({
                username,
                bitcoinAddress: address,
                ordinalAddress,
                signature,
                ownsBTCMachine,
            });
            await newBtcMachine.save();
        }

        res.json({
            success: true,
            message: "Account information updated successfully",
        });
    } catch (error) {
        console.error("Error updating account:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/////This should be moved to the right folder or we can rename the folder to hiveAccounts
const createFreeAccount = async (req, res) => {
    const { username, accountKeys } = req.body;

    console.log({ username, accountKeys })

    if (!username ) {
        return res.status(400).json({ error: 'Username is required' });
    }
    
    try {

        // Check if the username or BTC address has already been used
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).json({ error: 'This username has already been used to create an account' });
        }

        const accountCreator = process.env.HIVE_ACCOUNT_CREATOR;
        const activeKey = dhive.PrivateKey.fromString(process.env.HIVE_ACCOUNT_CREATOR_ACTIVE_KEY);

        // const ownerKey = dhive.PrivateKey.fromLogin(username, 'owner', 'posting');
        // const activeKeyNew = dhive.PrivateKey.fromLogin(username, 'active', 'posting');
        // const postingKey = dhive.PrivateKey.fromLogin(username, 'posting', 'posting');
        // const memoKey = dhive.PrivateKey.fromLogin(username, 'memo', 'posting');

        const publicOwnerKey = accountKeys.ownerPubkey
        const publicActiveKey = accountKeys.activePubkey
        const publicPostingKey = accountKeys.postingPubkey
        const publicMemoKey = accountKeys.memoPubkey

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

        const newUser = new User({
            username,
        });

        await newUser.save();

        res.json({
            success: true,
            result: createAccount,
            message: "Hive account created successfully"
            // keys: {
            //     owner: ownerKey.toString(),
            //     active: activeKeyNew.toString(),
            //     posting: postingKey.toString(),
            //     memo: memoKey.toString(),
            // }
        });
    } catch (error) {
        console.log("error.....", error.message)
        res.status(500).json({ error: error.message });
    }
};

const checkBtcBal = async (req, res) => {
    try {
      const { address } = req.params;
      console.log(address);
  
      const result = await getBitcoinMainnetBalance(address);
      console.log(result);
  
      res.json({ success: true, balance: result });
    } catch (error) {
      console.error('Error fetching Bitcoin balance:', error);
      res.status(500).json({ success: false, message: 'Error fetching Bitcoin balance' });
    }
  };

const getAddressTransactions = async (req, res) => {
    try {
        const { address } = req.params;
        console.log(address)

        const result = await  getBitcoinAddressTransactions(address);
        console.log(result)
        res.json({ success: true, transactions: result });
    } catch (error) {
        
    }
}

const checkForBcMachine = async (req, res) => {
    try {
        const { address } = req.params;
        console.log(address)

        const result = await  checkBTCMachineOwnership(address);
        console.log("result",result)
        if(!result) {
            return res.status(400).json({
                success: false,
                message: 'Bitcoin address has no ordinal/machine',
              });
        }

        return res.status(400).json({
            success: true,
            transactions: result
          });
    } catch (error) {
        
    }
}

async function fetchOrdinals(address) {
    try {
        const apiUrl = `https://ordinals.com/api/address/${address}`; // Replace with the correct API endpoint.
        
        // Fetch data from the API
        const response = await axios.get(apiUrl);
        
        // Assuming the API returns a list of ordinals
        const ordinals = response.data;

        // Check if any ordinals exist
        if (ordinals && ordinals.length > 0) {
            console.log(`Ordinals for address ${address}:`);
            ordinals.forEach((ordinal, index) => {
                console.log(`Ordinal #${index + 1}:`);
                console.log(`  ID: ${ordinal.id}`);
                console.log(`  Inscription: ${ordinal.inscription}`);
                console.log(`  Content: ${ordinal.content}`);
                console.log(`  Transaction: ${ordinal.txid}`);
                console.log('---');
            });
        } else {
            console.log(`No ordinals found for address ${address}.`);
        }
    } catch (error) {
        console.error(`Error fetching ordinals for address ${address}:`, error.message);
    }
} 

module.exports = { checkBTCMachineOwnership, createBtcMachineAccount, checkBtcBal, getAddressTransactions, createOneBtcAccount, createFreeAccount, generateHiveAccountKeys, checkForBcMachine, updateAccountWithBtcInfo };

// checkBTCMachineOwnership("3Ayy1eAVMmgBh4JDAGJv1kcdJq49suDC58")