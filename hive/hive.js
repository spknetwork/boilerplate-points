const dhive = require('@hiveio/dhive');
const { PrivateKey } = require("@hiveio/dhive");
const {  getPrivateKeys, generatePassword } = require("./key-handler");
const client = require("./client")
const LightningAccount = require("../models/LightningAccounts.js");

const bridgeApiCall = (endpoint, params) =>
client.call("bridge", endpoint, params);

const getAccounts = async (usernames) => await client.database.getAccounts(usernames);
  
const getAccount = async (username) => await getAccounts([username]).then((resp) => resp[0]);

const createAccountWithKey = async (
    data,
    creator_account,
    // creator_key
  ) => {
    try {
      const { username, pub_keys, fee } = data;

      const private_key = PrivateKey.fromString("test key goes here") // we will handle this properly, this is for tesing sake
  
      const account = {
        name: username,
        ...pub_keys,
        active: false
      };

      console.log("ACCOUNT", account)
  
      let tokens = await client.database.getAccounts([creator_account]);
      tokens = tokens[0]?.pending_claimed_accounts;
  
      let op_name = "account_create";
  
      const owner = {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[account.ownerPublicKey, 1]]
      };
      const active = {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[account.activePublicKey, 1]]
      };
      const posting = {
        weight_threshold: 1,
        account_auths: [["spk", 1]], //we should replace with actual account
        key_auths: [[account.postingPublicKey, 1]]
      };
      const ops = [];
      const params = {
        creator: creator_account,
        new_account_name: account?.name,
        owner,
        active,
        posting,
        memo_key: account.memoPublicKey,
        json_metadata: "",
        extensions: [],
        fee
      };
  
      const operation = [op_name, params];
      ops.push(operation);
  
      try {
        const newAccount = await client.broadcast.sendOperations(ops, private_key);
        return newAccount;
      } catch (err) {
        console.log(err.message);
        return err.jse_info?.name;
      }
    } catch (err) {
      console.log(err);
      return err;
    }
  };

const createAccountKeys = async (username) => {
  try {
    const masterPassword = await generatePassword(32);
    const keys = getPrivateKeys(
      username,
      masterPassword
    );

    const accountInfo = {
      masterPassword,
      keys
    };    

    return accountInfo;
  } catch (err) {
    console.log(err)
  }
};

const getCommunity = (name, observer = "") => {
  return bridgeApiCall("get_community", { name, observer })
    .then(result => {
      console.log(result)
      return result;
    })
    .catch(error => {
      console.error(error);
      return null;
    });
};

const createHiveAccount = async (username) => {
  try {
    const existingUser = await LightningAccount.findOne({ username, status: "paid" });
    if (!existingUser) {
      throw new Error("No paid user found for this username");
    }

    const { ownerPubkey, activePubkey, postingPubkey, memoPubkey } = existingUser.keys;

    const accountCreator = process.env.HIVE_ACCOUNT_CREATOR;
    const activeKey = dhive.PrivateKey.fromString(process.env.HIVE_ACCOUNT_CREATOR_ACTIVE_KEY);

    const tx = await client.broadcast.sendOperations(
      [
        [
          "create_claimed_account",
          {
            creator: accountCreator,
            new_account_name: username,
            owner: {
              weight_threshold: 1,
              account_auths: [],
              key_auths: [[ownerPubkey, 1]],
            },
            active: {
              weight_threshold: 1,
              account_auths: [],
              key_auths: [[activePubkey, 1]],
            },
            posting: {
              weight_threshold: 1,
              account_auths: [],
              key_auths: [[postingPubkey, 1]],
            },
            memo_key: memoPubkey,
            json_metadata: "",
            extensions: [],
          },
        ],
      ],
      activeKey
    );

    existingUser.hiveTxId = tx.id;
    existingUser.status = "account_created";
    await existingUser.save();

    console.log(`✅ Hive account @${username} created, tx: ${tx.id}`);
    return tx;
  } catch (error) {
    console.error("createHiveAccount error:", error.message);
    throw error;
  }
};

module.exports = createHiveAccount;

// function to start watching transactions
async function watchPayments(paymentAccount) {
  console.log(`👀 Watching transactions for @${paymentAccount}...`);

  const stream = await client.blockchain.getOperationsStream();

  for await (const op of stream) {
    try {
      if (op.op[0] === "transfer") {
        const { from, to, amount, memo } = op.op[1];

        
        // console.log("memo....", memo)
        
        // Check if payment is to our account
        if (to === paymentAccount) {
          const formatMemo = memo.split("|").map(s => s.trim());
          const formattedMemo = formatMemo[0];

          console.log(`💸 Payment detected from @${from} of ${amount} with memo "${formattedMemo}"`);

          // Find pending user with this memo (username)
          const user = await LightningAccount.findOne({ username: formattedMemo, status: "pending" });
          if (!user) {
            console.log(`⚠️ No matching pending user found for memo: ${formattedMemo}`);
            continue;
          }

          // Update to "paid"
          user.status = "paid";
          user.satsPaid = Number(amount.split(" ")[0]); // crude amount parsing
          user.paidAt = new Date();
          await user.save();

          console.log(`✅ User ${formattedMemo} marked as paid.`);

          // Trigger hive account creation
          await createHiveAccount(formattedMemo);
        }
      }
    } catch (err) {
      console.error("Error processing transaction:", err.message); 
    }
  }
}

// Example usage
watchPayments("lightningin");

const memo = "test-onboard | #sats 300";

const accountMemo = memo.split("|")[0].trim();

console.log(accountMemo);


  
  module.exports = {
    getAccount,
    getAccounts,
    createAccountWithKey,
    createAccountKeys,
    getCommunity
  }