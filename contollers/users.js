const Point = require('../models/Point');
const User = require('../models/User');
const { getAccount, createAccountWithKey, createAccountKeys } = require("../hive/hive");
const { sendEmail } = require("../utils/mailgun")

// This migt not be relevant anymore since we are not creating an already existing account, we alreay implemented keychain login
const createUser = async (req, res) => {
  try {
    const { username, community } = req.body;

    const isHiveAccount = await getAccount(username)

    if (!isHiveAccount) {
      return res.status(404).json({
        message:"This username provided is not associated with a Hive account. Please create a Hive account to continue.",
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

    const existingPointsRecord = await Point.findOne({ user: user._id, communityName: community });

    if (!existingPointsRecord) {
      const pointsRecord = new Point({
        user: user._id,
        communityName: community,
        pointsBalance: 0,
        symbol: "",
        unclaimedPoints: 10,
        points_by_type: {
          posts: 0,
          comments: 0,
          upvote: 0,
          reblog: 0,
          login: 0,
          delegation: 0,
          community: 0,
          checking: 0,
        },
        pending_points: {
          posts: 0,
          comments: 0,
          upvote: 0,
          reblog: 0,
          login: 0,
          delegation: 0,
          community: 0,
          checking: 0,
        },
      });

      await pointsRecord.save();
    } else {
      existingPointsRecord.points_by_type.login += 10;
      existingPointsRecord.unclaimedPoints += 10;
      await existingPointsRecord.save();
    }

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

      const existingPointsRecord = await Point.findOne({
        user: user._id,
        communityName: community,
      });

      if (!existingPointsRecord) {
        const pointsRecord = new Point({
          user: user._id,
          communityName: community,
          pointsBalance: 0,
          symbol: "",
          unclaimedPoints: 10,
          points_by_type: {
            posts: 0,
            comments: 0,
            upvote: 0,
            reblog: 0,
            login: 10,
            delegation: 0,
            community: 0,
            checking: 0,
          },
          pending_points: {
            posts: 0,
            comments: 0,
            upvote: 0,
            reblog: 0,
            login: 0,
            delegation: 0,
            community: 0,
            checking: 0,
          },
        });

        await pointsRecord.save();
      } else {
        existingPointsRecord.points_by_type.login += 10; // login points
        existingPointsRecord.unclaimedPoints += 10;
        await existingPointsRecord.save();
      }
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
   console.log(error)
  }
};

const createHiveAccountKc = async (req, res) => {
  try {
    const { username, community, referral, email } = req.body;
    
    console.log("email", email)
    if (!username || !community) {
      return res.status(400).json({
        message: 'Missing required keys: username or community',
      });
    };
    
    let user = await User.findOne({ username });

    if(user) {
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

      const existingPointsRecord = await Point.findOne({
        user: user._id,
        communityName: community,
      });

      if (!existingPointsRecord) {
        const pointsRecord = new Point({
          user: user._id,
          communityName: community,
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
          }
        });
        await pointsRecord.save();
      } else {
        existingPointsRecord.points_by_type.login.points += 10;
        existingPointsRecord.unclaimedPoints += 10;
        await existingPointsRecord.save();
      }
      //send onboard email to user
      sendEmail(username, referral, email)

      return res.status(200).json({
        success: true,
        message: "Hive account has been created successfully",
      });
   
  } catch (error) {
   console.log(error)
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

module.exports = {
    createUser,
    getAllUsers,
    createHiveAccount,
    createHiveAccountKc
}