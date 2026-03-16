const { differenceInMinutes } = require('date-fns');
const JWT = require('jsonwebtoken');
const { cryptoUtils, Signature, PrivateKey } = require('@hiveio/dhive');
const { getAccounts } = require('../hive/hive');
const client = require("../hive/client");
const User = require('../models/User');

const keychainAuth = async (req, res) => {
  try {
    const { username, ts, sig, message } = req.query;

    if (process.env.NODE_ENV === 'production') {
      const timeDifference = differenceInMinutes(Date.now(), Number(ts));
      if (timeDifference >= 3) {
        return res.status(409).json({
          error: 'Invalid timestamp. Please check that your system clock is correctly set.'
        });
      }
    }

    const [account] = await getAccounts([username]);
    if (!account) {
      return res.status(404).json({ success: false, msg: 'Account not found on Hive' });
    }

    let validSignature = false;

    // If a custom message is provided (e.g. from a reused login signature), use it.
    // Otherwise, use the standard ${username}${ts} format.
    const challenge = message ? message : `${username}${ts}`;

    const publicKey = Signature.fromString(sig)
      .recover(cryptoUtils.sha256(challenge))
      .toString();

    const thresholdPosting = account.posting.weight_threshold;
    const thresholdActive = account.active.weight_threshold;

    const authorizedAccountsPosting = new Map(account.posting.account_auths);
    const authorizedAccountsActive = new Map(account.active.account_auths);

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
      let accountsData = await client.database.getAccounts(
        Array.from(authorizedAccountsPosting.keys())
      );
      accountsData = accountsData.map((a) => a.posting.key_auths[0]);

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i];
        if (auth && auth[0] === publicKey && auth[1] >= thresholdPosting) {
          validSignature = true;
          break;
        }
      }
    }

    // Trying to validate using active authority
    if (!validSignature && authorizedAccountsActive.size > 0) {
      let accountsData = await client.database.getAccounts(
        Array.from(authorizedAccountsActive.keys())
      );
      accountsData = accountsData.map((a) => a.active.key_auths[0]);

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i];
        if (auth && auth[0] === publicKey && auth[1] >= thresholdActive) {
          validSignature = true;
          break;
        }
      }
    }

    if (validSignature) {
      const user = await User.findOneAndUpdate(
        { username: username.toLowerCase() },
        { $setOnInsert: { username } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Issue a long-lived JWT token to ensure relay/session stability
      const token = JWT.sign(
        {
          username: username.toLowerCase(),
          userId: user._id,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '12000h',
        }
      );

      return res.status(200).json({
        success: true,
        response: {
          ...user.toObject(),
          token,
        },
      });
    }

    return res.status(401).json({ success: false, msg: 'Invalid signature' });

  } catch (e) {
    console.error('Keychain Auth Error:', e.message);
    return res.status(501).json({ success: false, msg: 'Something went wrong' });
  }
};

const keysAuth = async (req, res) => {
  try {
    const { username, key } = req.body;
    let validSignature = false;
    const wif = PrivateKey.fromString(key);
    const publicKey = wif.createPublic().toString();
    const accounts = await client.database.getAccounts([username]);
    const account = accounts[0];

    if (!account) {
      return res.status(404).json({ success: false, msg: 'Account not found on Hive' });
    }

    const thresholdPosting = account.posting.weight_threshold;
    const thresholdActive = account.active.weight_threshold;

    const authorizedAccountsPosting = new Map(account.posting.account_auths);
    const authorizedAccountsActive = new Map(account.active.account_auths);

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
      let accountsData = await client.database.getAccounts(
        Array.from(authorizedAccountsPosting.keys())
      );
      accountsData = accountsData.map((a) => a.posting.key_auths[0]);

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i];
        if (auth && auth[0] === publicKey && auth[1] >= thresholdPosting) {
          validSignature = true;
          break;
        }
      }
    }

    // Trying to validate using active authority
    if (!validSignature && authorizedAccountsActive.size > 0) {
      let accountsData = await client.database.getAccounts(
        Array.from(authorizedAccountsActive.keys())
      );
      accountsData = accountsData.map((a) => a.active.key_auths[0]);

      for (let i = 0; i < accountsData.length; i += 1) {
        const auth = accountsData[i];
        if (auth && auth[0] === publicKey && auth[1] >= thresholdActive) {
          validSignature = true;
          break;
        }
      }
    }

    if (validSignature) {
      const user = await User.findOneAndUpdate(
        { username: username.toLowerCase() },
        { $setOnInsert: { username } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Issue a long-lived JWT token to ensure relay/session stability
      const token = JWT.sign(
        {
          username: username.toLowerCase(),
          userId: user._id,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '12000h',
        }
      );

      return res.status(200).json({
        success: true,
        response: {
          ...user.toObject(),
          token,
        },
      });
    }

    return res.status(401).json({ success: false, msg: 'Invalid key' });

  } catch (err) {
    console.error('Keys Auth Error:', err.message);
    return res.status(501).json({ success: false, msg: 'Something went wrong' });
  }
};

module.exports = { keychainAuth, keysAuth };
