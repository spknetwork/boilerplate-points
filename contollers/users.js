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
        points: [
          {
            communityName: community,
            pointsBalance: 10, 
            currency: "",
            unclaimedPoints: 0,
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
          },
        ],
      });

      await user.save();
      res.status(200).json({
        message: 'User created successfully',
        data: user,
      });
    } else {

      const communityToUpdate = user.points.find((c) => c.communityName === community);

      if (!communityToUpdate) {
        user.points.push({
          communityName: community,
          pointsBalance: 10,
          currency: "",
          unclaimedPoints: 0,
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
        });
      } else {
        communityToUpdate.points_by_type["10"] += 10;
        communityToUpdate.pointsBalance = Object.values(communityToUpdate.points_by_type).reduce((sum, value) => sum + value, 0);
      }

      user.pointsBalance = user.points.reduce((sum, community) => sum + community.pointsBalance, 0);

      await user.save();

      res.status(200).json({
        message: 'User updated successfully',
        data: user,
      });
    }
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