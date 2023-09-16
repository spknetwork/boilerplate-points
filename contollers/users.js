const Point = require('../models/Point');
const User = require('../models/User');

const createUser = async (req, res) => {
  try {
    if (!req.body.username || !req.body.community) {
      return res.status(400).json({
        message: 'Missing required keys: username or community',
      });
    }

    const { username, community } = req.body;

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
        currency: "",
        unclaimedPoints: 10,
        points_by_type: {
          "10": 10,
          "20": 0,
          "30": 0,
          "100": 0,
          "110": 0,
          "120": 0,
          "130": 0,
          "150": 0,
          "160": 0,
        },
        pending_points: {
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
      });

      await pointsRecord.save();
    } else {
      existingPointsRecord.points_by_type["10"] += 10;
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
    getAllUsers
}