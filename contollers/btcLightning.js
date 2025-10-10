const LightningAccount = require("../models/LightningAccounts.js");

const createFreeLightAccount = async (req, res) => {
    const { 
      username,
      accountKeys,
      token,
      payment_addr,
      payment_hash,
      payment_request,
      r_hash,
      v4vMemo,
      satsAmount,
    } = req.body;
  
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
  
    try {
      const existingUser = await LightningAccount.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: "This username is already registered" });
      }
  
      const newUser = new LightningAccount({
        username,
        keys: accountKeys,
        lightningInvoice: payment_request,
        paymentHash: payment_hash || r_hash,
        rHash: r_hash,
        paymentAddress: payment_addr,
        memo: username,
        token,
        v4vMemo,
        satsAmount,
        status: "pending",
      });
  
      await newUser.save();
  
      res.json({
        success: true,
        result: newUser,
        message: "Request saved. Awaiting payment confirmation.",
      });
    } catch (error) {
      console.log("error.....", error.message);
      res.status(500).json({ error: error.message });
    }
  };

  // ✅ Check Lightning Account Status
const getAccountStatus = async (req, res) => {
    const { username } = req.params;
  
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
  
    try {
      const account = await LightningAccount.findOne({ username });
      console.log(account)
  
      if (!account) {
        return res.json({ created: false });
      }
  
      res.json({
        created: true,
        status: account.status,  // pending | paid | created
        account,
      });
    } catch (error) {
      console.error("❌ Error checking account status:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
  module.exports = { createFreeLightAccount, getAccountStatus };