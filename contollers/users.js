const UserPoints = require('../models/UserPoints');
const PointLedger = require('../models/PointLedger');
const User = require('../models/User');
const BitcoinMachines = require("../models/BitcoinMachines")
const { getAccount, createAccountWithKey, createAccountKeys } = require("../hive/hive");
const { sendEmail } = require("../utils/mailgun")

// This migt not be relevant anymore since we are not creating an already existing account, we alreay implemented keychain login
const createUser = async (req, res) => {
  try {
    const { username, community } = req.body;

    const isHiveAccount = await getAccount(username)


    if (!isHiveAccount) {
      return res.status(404).json({
        message: "This username provided is not associated with a Hive account. Please create a Hive account to continue.",
      });
    }

    if (!req.body.username || !req.body.community) {
      return res.status(400).json({
        message: 'Missing required keys: username or community',
      });
    }

    let user = await User.findOne({ username });

    if (!user) {
      user = new User({
        username,
      });

      await user.save();
    }

    const existingPointsRecord = await UserPoints.findOne({ username, communityId: community });

    if (!existingPointsRecord) {
      await UserPoints.create({
        username,
        communityId: community,
        unclaimedPoints: 10
      });
    } else {
      existingPointsRecord.unclaimedPoints += 10;
      await existingPointsRecord.save();
    }

    // Log the award
    await PointLedger.create({
      username,
      communityId: community,
      actionType: 'login', // Initial join points treated as login
      points: 10
    });

    res.status(200).json({
      message: 'User created successfully',
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json('Something went wrong on our end');
  }
};

const createHiveAccount = async (req, res) => {
  try {
    const { username, community } = req.body;

    const isHiveAccount = await getAccount(username);

    if (isHiveAccount) {
      return res.status(404).json({
        success: false,
        message: "The username has already been taken, please choose another one",
      });
    }

    const accountInfo = await createAccountKeys(username);
    const data = {
      username,
      pub_keys: {
        activePublicKey: accountInfo.keys.activePubkey,
        memoPublicKey: accountInfo.keys.memoPubkey,
        ownerPublicKey: accountInfo.keys.ownerPubkey,
        postingPublicKey: accountInfo.keys.postingPubkey,
      },
      fee: 3,
    };

    const resp = await createAccountWithKey(data, "codetester");
    if (resp?.id) {

      if (!username || !community) {
        return res.status(400).json({
          message: 'Missing required keys: username or community',
        });
      };

      let user = await User.findOne({ username });

      if (!user) {
        user = new User({
          username,
        });

        await user.save();
      }

      const existingPointsRecord = await UserPoints.findOne({
        username,
        communityId: community,
      });

      if (!existingPointsRecord) {
        await UserPoints.create({
          username,
          communityId: community,
          unclaimedPoints: 10
        });
      } else {
        existingPointsRecord.unclaimedPoints += 10;
        await existingPointsRecord.save();
      }

      await PointLedger.create({
        username,
        communityId: community,
        actionType: 'login',
        points: 10
      });
      //send onboard email to user
      sendEmail(username, referral, email)

      return res.status(200).json({
        success: true,
        message: "Hive account has been created successfully",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Sorry, something went wrong",
      });
    }
  } catch (error) {

  }
};

const createHiveAccountKc = async (req, res) => {
  try {
    const { username, community, referral, email } = req.body;


    if (!username || !community) {
      return res.status(400).json({
        message: 'Missing required keys: username or community',
      });
    };

    let user = await User.findOne({ username });

    if (user) {
      return res.status(400).json({
        success: false,
        message: "User has already been created"
      })
    }

    if (!user) {
      user = new User({
        username,
        email,
        referral
      });

      await user.save();
    }

    const currentDate = Date.now();

    const existingPointsRecord = await UserPoints.findOne({
      username,
      communityId: community,
    });

    if (!existingPointsRecord) {
      await UserPoints.create({
        username,
        communityId: community,
        unclaimedPoints: 10
      });
    } else {
      existingPointsRecord.unclaimedPoints += 10;
      await existingPointsRecord.save();
    }

    await PointLedger.create({
      username,
      communityId: community,
      actionType: 'login',
      points: 10
    });
    //send onboard email to user
    sendEmail(username, referral, email)

    return res.status(200).json({
      success: true,
      message: "Hive account has been created successfully",
    });

  } catch (error) {

  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllBtcUsers = async (req, res) => {
  try {
    const btcUsers = await BitcoinMachines.find();
    const usernames = btcUsers.map(user => user.username);

    return res.json({ usernames });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      bacUser: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  createHiveAccount,
  createHiveAccountKc,
  getUserByUsername,
  getAllBtcUsers
}