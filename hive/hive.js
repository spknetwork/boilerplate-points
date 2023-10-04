const { Client, PrivateKey, RCAPI, utils } = require("@hiveio/dhive");
const SERVERS = require("./servers");
const {  getPrivateKeys, generatePassword } = require("./key-handler")

const client = new Client(SERVERS, {
  timeout: 3000,
  failoverThreshold: 3,
  consoleOnFailover: true
});

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
    // console.log("msp", masterPassword)
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
  

  module.exports = {
    getAccount,
    createAccountWithKey,
    createAccountKeys
  }