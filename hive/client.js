const { Client } = require("@hiveio/dhive");
const SERVERS = require("./servers");

const client = new Client(SERVERS, {
    timeout: 3000,
    failoverThreshold: 3,
    consoleOnFailover: true
  });

  module.exports = client