const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const PointsHistory = require("../models/PointsHistory");
const Point = require("../models/Point");
const offchainUser = require("../models/offchainUser");

const solanaWeb3 = require('@solana/web3.js');

const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com');

const validateAddress = async (address)=> {
  try {
    const valid = new solanaWeb3.PublicKey(address);
    if (valid) return true;
  } catch (error) {
    console.log(error)
    if(error) return false;
  }
}

const registerUser = async (req, res) => {
  try {
    const { email, password, solanaWalletAddress } = req.body;

    if (!email || !password || !solanaWalletAddress) {
      return res.status(400).json({ success: false, message: "Some parameter missing" });
    }
    
    const isAddressValid = await validateAddress(solanaWalletAddress);
    console.log("isAddressValid", isAddressValid);
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
    console.log(err);
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

    const currentDate = Date.now();
    const existingPointsRecord = await Point.findOne({
      user: user._id,
      communityName: "solanna",
    });

    if (!existingPointsRecord) {
      const pointsRecord = new Point({
        user: user._id,
        communityName: "solanna",
        pointsBalance: 0,
        symbol: "",
        unclaimedPoints: 10,
        points_by_type: {
          posts: { points: 0, awarded_timestamps: [] },
          comments: { points: 0, awarded_timestamps: [] },
          upvote: { points: 0, awarded_timestamps: [] },
          reblog: { points: 0, awarded_timestamps: [] },
          login: { points: 10, awarded_timestamps: [currentDate] },
          delegation: { points: 0, awarded_timestamps: [] },
          community: { points: 0, awarded_timestamps: [] },
          checking: { points: 0, awarded_timestamps: [] },
        },
      });

      await pointsRecord.save();
    } else {
      if (
        existingPointsRecord.points_by_type.login.awarded_timestamps.filter(
          (timestamp) => currentDate - timestamp <= 86400000
        ).length >= 2
      ) {
        return res.status(200).json({
          message: "Login points already awarded twice today.",
          token,
        });
      }

      existingPointsRecord.points_by_type.login.points += 10;
      existingPointsRecord.unclaimedPoints += 10;
      existingPointsRecord.points_by_type.login.awarded_timestamps.push(currentDate);
      await existingPointsRecord.save();
    }

    await PointsHistory.create({
      user: user._id,
      community: "solanna",
      operationType: "login",
      pointsEarned: 10,
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
    console.log(address)
    
    if(!address) {
      console.log("no address provided")
    return res.status(400).json({success: false, message: "Address is required"})
    }

    const balance = await connection.getBalance(new solanaWeb3.PublicKey(address));
    const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;

    return res.status(200).json({success:true, balance: solBalance });
  } catch (error) {
    console.log(error)
    return res.status(500).json(error);
  }
};

module.exports ={ registerUser, loginUser, checkSolBalance }
