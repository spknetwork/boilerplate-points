const Point = require('../models/Point');
const User = require('../models/User');

// Create new user
const createUser = async (req, res) => {
    try {
      if (!req.body.username || !req.body.community) {
        return res.status(400).json({
          message: 'Missing required keys: username or community',
        });
      }
  
      const { username, community } = req.body;
  
      // Save user to the database or update if existing
      const new_user = await User.findOneAndUpdate(
        { username },
        {
          $setOnInsert: {
            username,
            community,
          },
        },
        { upsert: true, new: true, setDefaultOnInsert: true }
      ).lean();
  
      const userPoints = {
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
        unclaimed_points: 0,
      };
  
      // Get user points
      const new_point = await Point.findOneAndUpdate(
        { user: new_user._id },
        {
          $setOnInsert: {
            userPoints,
          },
        },
        { upsert: true, new: true, setDefaultOnInsert: true }
      ).select('-_id -__v').lean();
  
      // Add login points
      const loginPointsValue = 10; // Define the login points value
      new_point.points_by_type[10] += loginPointsValue;
  
      // Update the user's points for the "10" point type
      await Point.findOneAndUpdate(
        { user: new_user._id },
        { 'points_by_type.10': new_point.points_by_type[10] },
        { new: true }
      );
  
      delete new_point.id;
      delete new_point.__v;
  
      // Destructure req.body
      res.status(200).json({
        message: 'Successful',
        data: { ...new_user, ...new_point },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json('Something went wrong on our end');
    }
  };

module.exports = {
    createUser
}