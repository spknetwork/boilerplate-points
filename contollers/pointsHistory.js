const PointsHistory = require('../models/PointsHistory');
const User = require('../models/User');

const getPointsHistory = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const pointsHistory = await PointsHistory.find({ user: user._id }).sort({ timestamp: -1 });

    res.status(200).json({
      message: 'Points history fetched successfully',
      data: {
        pointsHistory,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Something went wrong on our end',
    });
  }
};

module.exports = { getPointsHistory };
