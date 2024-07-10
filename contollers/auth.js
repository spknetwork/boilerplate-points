const { differenceInMinutes } = require('date-fns');
const JWT = require('jsonwebtoken');
const { cryptoUtils, Signature, PrivateKey, PublicKey } = require('@hiveio/dhive');
const { getAccounts } = require('../hive/hive');
const client = require("../hive/client")
const Point = require('../models/Point');
const PointsHistory = require('../models/PointsHistory');
const User = require('../models/User');

const keychainAuth = async (req, res) => {
  try {
    const { username, ts, sig, community } = req.query;
    let response;

    if (process.env.NODE_ENV === 'production') {
      const timeDifference = differenceInMinutes(Date.now(), ts);
      if (timeDifference >= 3) {
        return res.status(409).send(
          'Invalid timestamp. Please check that your system clock is correctly set.'
        );
      }
    }
    const [account] = await getAccounts([username]);

    let validSignature = false;

    const publicKey = Signature.fromString(sig)
      .recover(cryptoUtils.sha256(`${username}${ts}`))
      .toString();

    const thresholdPosting = account.posting.weight_threshold;
    const thresholdActive = account.active.weight_threshold;

    const authorizedAccountsPosting = new Map(
      account.posting.account_auths
    );
    const authorizedAccountsActive = new Map(
      account.active.account_auths
    );

    // Trying to validate using posting key
    if (!validSignature) {
      for (let i = 0; i < account.posting.key_auths.length; i += 1) {
        const auth = account.posting.key_auths[i];

        if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
          validSignature = true;
          break;
        }
      }
    }

    // Trying to validate using active key
    if (!validSignature) {
      for (let i = 0; i < account.active.key_auths.length; i += 1) {
        const auth = account.active.key_auths[i];

        if (auth[0] === publicKey && auth[1] >= thresholdActive) {
          validSignature = true;
          break;
        }
      }
    }

    // Trying to validate using posting authority
    if (!validSignature && authorizedAccountsPosting.size > 0) {
      let accountsData = await hiveClient.database.getAccounts(
        Array.from(authorizedAccountsPosting.keys())
      );

      accountsData = accountsData.map((a) => a.posting.key_auths[0]);

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i];

        if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
          validSignature = true;
          break;
        }
      }
    }

    // Trying to validate using active authority
    if (!validSignature && authorizedAccountsActive.size > 0) {
      let accountsData = await hiveClient.database.getAccounts(
        Array.from(authorizedAccountsActive.keys())
      );

      accountsData = accountsData.map((a) => a.active.key_auths[0]);

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i];

        if (auth[0] === publicKey && auth[1] >= thresholdActive) {
          validSignature = true;
          break;
        }
      }
    }

    if (validSignature) {
      const user = await User.findOneAndUpdate(
        { username },
        {
          $setOnInsert: {
            username,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

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
          symbol: '',
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
          const token = JWT.sign(
            {
              username: username,
              userId: user._id,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: '12000h', //test
            }
          );

          response = {
            ...user,
            token,
          };

          return res.status(200).json({
            success: true,
            response,
            message: 'Login points already awarded twice today.',
          });
        }
        
        existingPointsRecord.points_by_type.login.points += 10;
        existingPointsRecord.unclaimedPoints += 10;
        existingPointsRecord.points_by_type.login.awarded_timestamps.push(currentDate);
        await existingPointsRecord.save();
      }
      console.log("test",user._id)
      
      const token = JWT.sign(
        {
          username: username,
          userId: user._id,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '12000h', //test
        }
        );
        
        response = {
          ...user,
        token,
      };
  
      await PointsHistory.create({
        user: user._id,
        community,
        operationType: "login",
        pointsEarned: 10,
      });
      
      return res.status(200).json({
        success: true,
        response,
      });
    }

  } catch (e) {
    console.log(e.message);
    return res
      .status(501)
      .json({ success: false, msg: 'Something went wrong' });
  }
};

const keysAuth = async (req, res) => {
  try {
    const { username, key, community} = req.body;
    console.log(username, key)

    let validSignature = false;
    let keyType;
    const wif = PrivateKey.fromString(key);
    const publicKey = wif.createPublic().toString();
    const accounts = await client.database.getAccounts([username]);
    const account = accounts[0];

    const thresholdPosting = account?.posting.weight_threshold;
    const thresholdActive = account?.active.weight_threshold;

    const authorizedAccountsPosting = new Map(account.posting.account_auths);
    const authorizedAccountsActive = new Map(account.active.account_auths);

    // Trying to validate using posting key
    if (!validSignature) {
      for (let i = 0; i < account.posting.key_auths.length; i += 1) {
        const auth = account.posting.key_auths[i];

        if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
          validSignature = true;
          keyType = 'posting';
          break;
        }
      }
    }

    // Trying to validate using active key
    if (!validSignature) {
      for (let i = 0; i < account.active.key_auths.length; i += 1) {
        const auth = account.active.key_auths[i];

        if (auth[0] === publicKey && auth[1] >= thresholdActive) {
          keyType = 'active';
          validSignature = true;
          break;
        }
      }
    }

    // Trying to validate using posting authority
    if (!validSignature && authorizedAccountsPosting.size > 0) {
      let accountsData = await hiveClient.database.getAccounts(
        Array.from(authorizedAccountsPosting.keys()),
      );

      accountsData = accountsData.map((a) => a.posting.key_auths[0]);

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i];

        if (auth[0] === publicKey && auth[1] >= thresholdPosting) {
          keyType = 'posting';
          validSignature = true;
          break;
        }
      }
    }

    // Trying to validate using active authority
    if (!validSignature && authorizedAccountsActive.size > 0) {
      let accountsData = await hiveClient.database.getAccounts(
        Array.from(authorizedAccountsActive.keys()),
      );

      accountsData = accountsData.map((a) => a.active.key_auths[0]);

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i];

        if (auth[0] === publicKey && auth[1] >= thresholdActive) {
          keyType = 'active';
          validSignature = true;
          break;
        }
      }
    }

    if (validSignature) {
      const user = await User.findOneAndUpdate(
        { username },
        {
          $setOnInsert: {
            username,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

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
          symbol: '',
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
          const token = JWT.sign(
            {
              username: username,
              userId: user._id,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: '12h',
            }
          );

          response = {
            ...user,
            token,
          };

          await PointsHistory.create({
            user: user._id,
            community,
            operationType: "login",
            pointsEarned: 10,
          });

          return res.status(200).json({
            success: true,
            response,
            message: 'Login points already awarded twice today.',
          });
        }

        existingPointsRecord.points_by_type.login.points += 10;
        existingPointsRecord.unclaimedPoints += 10;
        existingPointsRecord.points_by_type.login.awarded_timestamps.push(currentDate);
        await existingPointsRecord.save();
      }

      const token = JWT.sign(
        {
          username: username,
          userId: user._id,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '12h',
        }
      );

      response = {
        ...user,
        token,
      };

      return res.status(200).json({
        success: true,
        response,
      });
    }

  } catch (err) {
    console.error(err.message);
    return res
      .status(501)
      .json({ success: false, msg: 'Something went wrong' });
  }
};

module.exports = { keychainAuth, keysAuth };
