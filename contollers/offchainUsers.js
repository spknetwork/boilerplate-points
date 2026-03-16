const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserPoints = require("../models/UserPoints");
const PointLedger = require("../models/PointLedger");
const offchainUser = require("../models/offchainUser");

const solanaWeb3 = require('@solana/web3.js');

const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com');

const validateAddress = async (address) => {
  try {
    const valid = new solanaWeb3.PublicKey(address);
    if (valid) return true;
  } catch (error) {

    if (error) return false;
  }
}

const registerUser = async (req, res) => {
  try {
    const { email, password, solanaWalletAddress } = req.body;

    if (!email || !password || !solanaWalletAddress) {
      return res.status(400).json({ success: false, message: "Some parameter missing" });
    }

    const isAddressValid = await validateAddress(solanaWalletAddress);

    if (!isAddressValid) {
      return res.status(404).json({ success: false, message: "Inavlid Solana address provided" });
    }

    const existingUser = await offchainUser.findOne({ solanaWalletAddress });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Address already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new offchainUser({
      email,
      password: hashedPassword,
      solanaWalletAddress,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (err) {

    res.status(500).json({ success: false, message: "Something went wrong on our end" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await offchainUser.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please register if you do not have an account.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid password. Please enter the correct password.",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    const existingPointsRecord = await UserPoints.findOne({
      username: user.username || email, // Fallback if username is unset
      communityId: "solanna",
    });

    if (!existingPointsRecord) {
      await UserPoints.create({
        username: user.username || email,
        communityId: "solanna",
        unclaimedPoints: 10
      });
    } else {
      // Check for rate limit: max 2 logins per 24h
      const todayTotal = await PointLedger.countDocuments({
        username: user.username || email,
        communityId: "solanna",
        actionType: "login",
        createdAt: { $gte: new Date(Date.now() - 86400000) }
      });

      if (todayTotal < 2) {
        existingPointsRecord.unclaimedPoints += 10;
        await existingPointsRecord.save();
      } else {
        return res.status(200).json({
          message: "Login points already awarded twice today.",
          token,
        });
      }
    }

    await PointLedger.create({
      username: user.username || email,
      communityId: "solanna",
      actionType: "login",
      points: 10,
    });

    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json("Something went wrong on our end");
  }
};

const checkSolBalance = async (req, res) => {
  try {
    const { address } = req.params;


    if (!address) {

      return res.status(400).json({ success: false, message: "Address is required" })
    }

    const balance = await connection.getBalance(new solanaWeb3.PublicKey(address));
    const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;

    return res.status(200).json({ success: true, balance: solBalance });
  } catch (error) {

    return res.status(500).json(error);
  }
};

module.exports = { registerUser, loginUser, checkSolBalance }
