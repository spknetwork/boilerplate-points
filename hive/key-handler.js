const { PrivateKey } = require("@hiveio/dhive");

const { randomBytes } = require("crypto");

const getPrivateKeys = (username, password) => {
    const roles = ["owner", "active", "posting", "memo"];
    
    let privKeys = {
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
  
    return privKeys;
  };  

const generatePassword = async (length) => {
    const password = `P${PrivateKey.fromSeed(randomBytes(length).toString("hex")).toString()}`;
    return password;
  };

  module.exports = {
    getPrivateKeys,
    generatePassword
  }