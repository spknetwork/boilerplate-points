const dhive = require('@hiveio/dhive');
const { PrivateKey } = require("@hiveio/dhive");
const { getPrivateKeys, generatePassword } = require("./key-handler");
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

    const private_key = PrivateKey.fromString(process.env.HIVE_TEST_KEY)

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
    const existingUser = await LightningAccount.findOne({ username, status: { $in: ["paid", "pending"] } });
    if (!existingUser) {
      throw new Error("No pending or paid user found for this username");
    }

    // 1. Check if account ALREADY exists on-chain to avoid unnecessary broadcast
    const [onChainAcc] = await client.database.getAccounts([username]);
    if (onChainAcc) {
      console.log(`ℹ️ Account @${username} already exists on blockchain. Marking as created.`);
      existingUser.status = "account_created";
      await existingUser.save();
      return { success: true, alreadyExists: true };
    }

    const { ownerPubkey, activePubkey, postingPubkey, memoPubkey } = existingUser.keys;
    const accountCreator = process.env.HIVE_ACCOUNT_CREATOR || 'oracle-d';
    const activeKey = dhive.PrivateKey.fromString(process.env.HIVE_ACCOUNT_CREATOR_ACTIVE_KEY);

    // Try to use claimed account (ACT) if available
    const [creatorAccount] = await client.database.getAccounts([accountCreator]);
    const op_name = creatorAccount.pending_claimed_accounts > 0 ? "create_claimed_account" : "account_create";

    const op_params = {
      creator: accountCreator,
      new_account_name: username,
      owner: { weight_threshold: 1, account_auths: [], key_auths: [[ownerPubkey, 1]] },
      active: { weight_threshold: 1, account_auths: [], key_auths: [[activePubkey, 1]] },
      posting: { weight_threshold: 1, account_auths: [], key_auths: [[postingPubkey, 1]] },
      memo_key: memoPubkey,
      json_metadata: existingUser.jsonMetadata || "",
      extensions: [],
    };

    if (op_name === "account_create") {
      const props = await client.database.getChainProperties();
      op_params.fee = props.account_creation_fee;
    }

    const tx = await client.broadcast.sendOperations([[op_name, op_params]], activeKey);

    existingUser.hiveTxId = tx.id;
    existingUser.status = "account_created";
    await existingUser.save();

    console.log(`✅ Hive account @${username} created via ${op_name}, tx: ${tx.id}`);
    return tx;
  } catch (error) {
    if (error.message.includes("Account name") && error.message.includes("is not valid")) {
      console.error(`🛑 Marking @${username} as INVALID_NAME to stop retries.`);
      const user = await LightningAccount.findOne({ username });
      if (user) {
        user.status = "invalid_name";
        await user.save();
      }
    }
    console.error("createHiveAccount error:", error.message);
    throw error;
  }
};

const WatcherState = require("../models/WatcherState");

const Message = require("../models/Message.js");

// function to start watching transactions
async function watchPayments(paymentAccount, io) {
  const targets = ["bac.onboard"].map(a => a.toLowerCase());
  const messagingId = "messaging";
  console.log(`🚀 Starting high-speed payment/message watcher for: ${targets.join(", ")} & '${messagingId}'`);

  const processMessagingOp = async (op, trx_id, timestamp) => {
    try {
      if (op.id !== messagingId) return;
      const parsed = JSON.parse(op.json);
      if (!Array.isArray(parsed) || parsed[0] !== 'message') return;

      const { to, message, v } = parsed[1];
      const from = op.required_posting_auths[0];

      if (!from || !to || !message) return;

      // Save to DB (upsert based on trx_id to avoid duplicates)
      const msgDoc = await Message.findOneAndUpdate(
        { trx_id },
        { from, to, message, timestamp, v: v || '1.0', trx_id },
        { upsert: true, new: true }
      );

      console.log(`✉️ Indexed message from @${from} to @${to}`);

      // Emit real-time notification via Socket.io
      if (io) {
        io.to(to).emit('new_message', msgDoc);
        io.to(from).emit('new_message', msgDoc); // Sync for sender
      }
    } catch (e) {
      console.error("Error processing messaging op:", e.message);
    }
  };

  const reconcileHistory = async () => {
    console.log(`[Reconciler] Scanning history...`);
    for (const target of targets) {
      try {
        const history = await client.call('condenser_api', 'get_account_history', [target, -1, 15]);
        if (!Array.isArray(history)) continue;

        for (const item of history) {
          const op = item[1].op;
          const trx_id = item[1].trx_id;
          const timestamp = item[1].timestamp;

          if (op[0] === 'transfer') {
            const { from, to, amount, memo } = op[1];
            if (targets.includes(to.toLowerCase())) {
              const parts = memo.split("|").map(s => s.trim().toLowerCase());
              const user = await LightningAccount.findOne({
                username: { $in: parts },
                status: { $in: ["pending", "paid"] }
              });

              if (user) {
                if (user.status === "pending") {
                  console.log(`🎯 [HISTORY] Detected NEW payment! @${from} -> @${to} for @${user.username}`);
                  user.status = "paid";
                  user.satsPaid = Number(amount.split(" ")[0]);
                  user.paidAt = new Date();
                  await user.save();
                }

                try {
                  console.log(`⚡ [Reconciler] Attempting fulfillment for @${user.username}...`);
                  await createHiveAccount(user.username);
                } catch (err) {
                  console.error(`❌ [Reconciler] Fulfillment error for @${user.username}:`, err.message);
                }
              }
            }
          } else if (op[0] === 'custom_json') {
            await processMessagingOp(op[1], trx_id, timestamp);
          }
        }
      } catch (err) {
        console.error(`⚠️ [Reconciler] History scan failed for @${target}:`, err.message);
      }
    }
  };

  // Run history scan every 10 seconds as a swift fallback/retry
  setInterval(reconcileHistory, 10000);

  const startLiveStream = async () => {
    try {
      console.log(`📡 Opening live head-block stream...`);
      const stream = client.blockchain.getOperationsStream({ mode: 0 });

      for await (const op of stream) {
        if (op.op[0] === "transfer") {
          const { from, to, amount, memo } = op.op[1];
          if (targets.includes(to.toLowerCase())) {
            const parts = memo.split("|").map(s => s.trim().toLowerCase());
            const user = await LightningAccount.findOne({
              username: { $in: parts },
              status: { $in: ["pending", "paid"] }
            });

            if (user) {
              if (user.status === "pending") {
                console.log(`🔍 [${op.block_num}] Live Match: @${from} -> @${to} (${amount})`);
                user.status = "paid";
                user.satsPaid = Number(amount.split(" ")[0]);
                user.paidAt = new Date();
                await user.save();
              }

              try {
                console.log(`⚡ [Live] Attempting fulfillment for @${user.username}...`);
                await createHiveAccount(user.username);
              } catch (err) {
                console.error(`❌ [Live] Fulfillment failed for @${user.username}:`, err.message);
              }
            }
          }
        } else if (op.op[0] === "custom_json") {
          await processMessagingOp(op.op[1], op.trx_id, op.timestamp);
        }
      }
    } catch (err) {
      console.error("❌ Stream lag/error, restarting...", err.message);
      setTimeout(startLiveStream, 2000);
    }
  };

  // Start both tracks immediately
  reconcileHistory();
  startLiveStream();
}

module.exports = {
  getAccount,
  getAccounts,
  createAccountWithKey,
  createAccountKeys,
  getCommunity,
  createHiveAccount,
  watchPayments
}