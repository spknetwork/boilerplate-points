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

    if (!user.points) {
      user.points = [];
    }

    const communityToUpdate = user.points.find((c) => c.communityName === community);

    if (!communityToUpdate) {
      // we create a commuity that doesn't exist
      const initialCommunityData = {
        communityName: community,
        points_by_type: {
          10: 0,
          20: 0,
          30: 0,
          100: 0,
          110: 0,
          120: 0,
          130: 0,
          150: 0,
          160: 0,
        },
        pointsBalance: 0,
        currency: "", //this is for community symbol
        unclaimedPoints: 0,
      };
      user.points.push(initialCommunityData);
    }

    const updatedCommunity = user.points.find((c) => c.communityName === community);

    // sample points distribution
    const pointsToAdd = {
      "10": 10,
      "20": 20,
      "30": 30,
      "100": 15,
      "110": 110,
      "120": 120,
      "130": 130,
      "150": 150,
      "160": 160,
    };

    if (updatedCommunity.points_by_type.hasOwnProperty(pointType)) {
      updatedCommunity.points_by_type[pointType] += pointsToAdd[pointType];
    } else {
      console.log("Unspecified point type: no points to claim");
    }

    updatedCommunity.pointsBalance = Object.values(updatedCommunity.points_by_type).reduce(
      (acc, val) => acc + val,
      0
    );

    user = await user.save();

    res.status(200).json({
      message: 'Points updated successfully',
      data: {
        user
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

    const points = user.points;

    const { community } = user;

    return res.json({ username, community, points });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllUsersPoints = async (req, res) => {
  try {
    const userPoints = await User.aggregate([
      {
        $unwind: "$points"
      },
      {
        $group: {
          _id: "$_id",
          username: { $first: "$username" },
          totalPoints: { $sum: "$points.points_by_type.10" }
        }
      },
      {
        $project: {
          _id: 0, 
          username: 1,
          totalPoints: 1
        }
      }
    ]);

    return res.json({ userPoints });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
    updateUserPoints,
    getUserPoints,
    getAllUsersPoints
};