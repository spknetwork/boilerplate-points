const Point = require('../models/Point');
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');

const updateUserPoints = async (req, res) => {
  try {
    const { username, community, pointType } = req.body;

    if (!username || !community || !pointType) {
      return res.status(400).json({
        message: 'Missing required keys: username, community, or pointType',
      });
    }

    const pointsLimitations = {
      posts: 100,
      comments: 100,
      upvote: 100,
      reblog: 100,
      login: 100,
      delegation: 100,
      community: 100,
      checking: 100,
    };

    const pointsToAdd = {
      posts: 10,
      comments: 20,
      upvote: 30,
      reblog: 100,
      login: 110,
      delegation: 120,
      community: 130,
      checking: 150,
    };

    if (!pointsLimitations.hasOwnProperty(pointType)) {
      return res.status(400).json({
        message: 'Invalid point type',
      });
    }

    let user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    let communityToUpdate = await Point.findOne({
      user: user._id,
      communityName: community,
    });

    if (!communityToUpdate) {
      const initialCommunityData = {
        user: user._id,
        communityName: community,
        points_by_type: {
          posts: { points: 0, awarded_timestamps: [] },
          comments: { points: 0, awarded_timestamps: [] },
          upvote: { points: 0, awarded_timestamps: [] },
          reblog: { points: 0, awarded_timestamps: [] },
          login: { points: 0, awarded_timestamps: [] },
          delegation: { points: 0, awarded_timestamps: [] },
          community: { points: 0, awarded_timestamps: [] },
          checking: { points: 0, awarded_timestamps: [] },
        },
        pointsBalance: 0,
        symbol: '', // community token symbol
        unclaimedPoints: 0,
      };

      communityToUpdate = new Point(initialCommunityData);
    }

    const currentDate = Date.now();
    const lastAwardedTimestamps = communityToUpdate.points_by_type[pointType].awarded_timestamps;

    if (lastAwardedTimestamps.length >= pointsLimitations[pointType]) {
      return res.status(400).json({
        message: `Daily limit reached for ${pointType} points`,
      });
    }
    const pointsAwarded = pointsToAdd[pointType];

    await PointsHistory.create({
      user: user._id,
      community,
      operationType: pointType,
      pointsEarned: pointsAwarded,
    });

    communityToUpdate.points_by_type[pointType].points += pointsToAdd[pointType];
    communityToUpdate.unclaimedPoints += pointsToAdd[pointType];
    communityToUpdate.points_by_type[pointType].awarded_timestamps.push(currentDate);

    await communityToUpdate.save();

    res.status(200).json({
      message: 'Points updated successfully',
      data: {
        points: communityToUpdate,
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
    const { username, community } = req.query;
    console.log(username, community)

    const user = await User.findOne({ username });
    console.log(user)

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userPoints = await Point.find({
      user: user._id,
      communityName: community,
    });

    if(userPoints.length === 0) {
      return res.status(404).json({ error: 'Community not found for this user' });
    }

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
    }

    const points_by_type = pointsRecord.points_by_type;
    let totalPoints = 0;

    for (const pointType in points_by_type) {
      if (points_by_type.hasOwnProperty(pointType)) {
        totalPoints += points_by_type[pointType].points;
      }
    }

    pointsRecord.pointsBalance = totalPoints;
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

const getUserPointsByCommunity = async (req, res) => {
  try {
    const { id } = req.params;

    const pointsRecords = await Point.find({ communityName: id });

    res.status(200).json({
      message: 'User points by community retrieved successfully',
      data: pointsRecords,
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
    claimPoints,
    getUserPointsByCommunity
};