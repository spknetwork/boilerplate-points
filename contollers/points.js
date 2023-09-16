const Point = require('../models/Point');
const User = require('../models/User');

const updateUserPoints = async (req, res) => {
  try {
    const { username, community, pointType } = req.body;

    if (!username || !community || !pointType) {
      return res.status(400).json({
        message: 'Missing required keys: username, community, or pointType',
      });
    }

    let user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    let communityToUpdate = await Point.findOne({ user: user._id, communityName: community });

    if (!communityToUpdate) {
      const initialCommunityData = {
        user: user._id,
        communityName: community,
        points_by_type: {
          "10": 0,
          "20": 0,
          "30": 0,
          "100": 0,
          "110": 0,
          "120": 0,
          "130": 0,
          "150": 0,
          "160": 0,
        },
        pointsBalance: 0,
        currency: "", // This is for community symbol
        unclaimedPoints: 0,
      };

      communityToUpdate = new Point(initialCommunityData);
    }

    const pointsToAdd = {
      "10": 10,
      "20": 20,
      "30": 30,
      "100": 100,
      "110": 110,
      "120": 120,
      "130": 130,
      "150": 150,
      "160": 160,
    };

    if (pointsToAdd.hasOwnProperty(pointType)) {
      communityToUpdate.points_by_type[pointType] += pointsToAdd[pointType];
      communityToUpdate.unclaimedPoints += pointsToAdd[pointType];
    } else {
      console.log("Invalid point type: no points to add");
      return res.status(400).json({
        message: 'Invalid point type: no points to add',
      });
    }

    await communityToUpdate.save();

    res.status(200).json({
      message: 'Points updated successfully',
      data: {
        points: communityToUpdate
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Something went wrong on our end',
    });
  }
};

const getUserPoints = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPoints = await Point.find({ user: user._id });

    return res.json({ userPoints });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllUsersPoints = async (req, res) => {
  try {
    const userPoints = await Point.find();

    return res.json({ userPoints });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const claimPoints = async (req, res) => {
  try {
    const { username, community } = req.body;

    if (!username || !community) {
      return res.status(400).json({
        message: 'Missing required keys: username or community',
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const pointsRecord = await Point.findOne({ user: user._id, communityName: community });

    if (!pointsRecord) {
      return res.status(404).json({
        message: 'Community not found for this user',
      });
    };

    pointsRecord.pointsBalance = Object.values(pointsRecord.points_by_type).reduce((acc, val) => acc + val, 0);
    pointsRecord.unclaimedPoints = 0;

    await pointsRecord.save();

    res.status(200).json({
      message: 'Unclaimed points claimed successfully',
      data: {
        pointsRecord,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Something went wrong on our end',
    });
  }
};

module.exports = {
    updateUserPoints,
    getUserPoints,
    getAllUsersPoints,
    claimPoints
};