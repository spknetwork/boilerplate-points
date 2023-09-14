const Point = require('../models/Point');
const User = require('../models/User');

const updateUserPoints = async (req, res) => {
  try {
    if (!req.body.username || !req.body.community || !req.body.pointType) {
      return res.status(400).json({
        message: 'Missing required keys: username, community, or pointType',
      });
    }

    const { username, community, pointType } = req.body;

    // Check if the user exists
    let user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    // Check if the user already has points data, if not, create it
    if (!user.points) {
      const initialPointsData = {
        username: username,
        points: 0,
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
        pointsBalance: 0, // Initialize pointsBalance to 0
        unclaimed_points: 0,
      };

      // Update the user with initial points data
      user = await User.findOneAndUpdate(
        { username: username },
        { points: initialPointsData },
        { new: true }
      );
    }

    // Retrieve points data using the user's _id
    const points = await Point.findOne({ user: user._id });

    // Check if the specified point type exists
    if (!points.points_by_type.hasOwnProperty(pointType)) {
      return res.status(400).json({
        message: 'Invalid pointType',
      });
    }

    // Add points to the specified point type
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

    if (pointsToAdd.hasOwnProperty(pointType)) {
      points.points_by_type[pointType] += pointsToAdd[pointType];
    } else {
      console.log("Unspecified point type: no points to claim");
    }

    // Calculate the pointsBalance by summing all values in points_by_type
    const totalPointsBalance = Object.values(points.points_by_type).reduce(
      (acc, val) => acc + val,
      0
    );

    // Update the user's points for the specified point type and pointsBalance
    await Point.findOneAndUpdate(
      { user: user._id },
      { 'points_by_type': points.points_by_type, 'pointsBalance': totalPointsBalance },
      { new: true }
    );

    // Retrieve updated points data
    const updatedPoints = await Point.findOne({ user: user._id });
    console.log(updatedPoints);

    let { points_by_type, pointsBalance, currency } = updatedPoints;

    // Respond with the user's data along with the updated points data
    res.status(200).json({
      message: 'Points updated successfully',
      data: { user, points_by_type, pointsBalance, currency: community + "token" },
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
      console.log(req.params, user)
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const points = await Point.findOne({user: user._id})
      // console.log(points)

      const { community } = user
      
      return res.json({ username, community, points: points });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

module.exports = {
    updateUserPoints,
    getUserPoints,
};