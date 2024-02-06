const Docker = require("../models/Docker");
const Point = require("../models/Point");

const dockerSetup = async (req, res) => {
    const { containerName, port, tags, communityId, communityName, domain } = req.body;
  try {
    console.log("Request Body:", req.body);

    const existingCommunity = await Docker.findOne({ domain });
    if (existingCommunity) {
      return res.status(400).json({ error: 'Community with this domain already exists' });
    }

    const newDocker = new Docker({
      containerName,
      port,
      tags,
      communityId,
      communityName,
      domain,
    });

    await newDocker.save();

    res.status(200).json({ message: 'Community registered successfully', communityDocker: newDocker });
  } catch (error) {
    console.error('Error registering community:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllCommunitiesDocker = async (req, res) => {
  try {
    const allCommunitiesWithPoints = await Docker.aggregate([
      {
        $lookup: {
          from: 'points',
          localField: 'communityName',
          foreignField: 'communityName',
          as: 'points',
        },
      },
      {
        $addFields: {
          points: {
            $filter: {
              input: '$points',
              as: 'point',
              cond: {
                $eq: ['$$point.communityName', '$communityName'],
              },
            },
          },
          totalCommunityPoints: {
            $sum: {
              $map: {
                input: '$points',
                as: 'point',
                in: {
                  $sum: [
                    '$$point.points_by_type.posts.points',
                    '$$point.points_by_type.comments.points',
                    '$$point.points_by_type.upvote.points',
                    '$$point.points_by_type.reblog.points',
                    '$$point.points_by_type.login.points',
                    '$$point.points_by_type.delegation.points',
                    '$$point.points_by_type.community.points',
                    '$$point.points_by_type.checking.points',
                  ],
                },
              },
            },
          },
          numberOfMembers: { $size: '$points' },
        },
      },
      {
        $addFields: {
          activitiesCount: {
            $sum: [
              { $multiply: ['$activities.posts', 10] },
              { $multiply: ['$activities.comments', 20] },
              { $multiply: ['$activities.upvote', 30] },
              { $multiply: ['$activities.reblog', 100] },
              { $multiply: ['$activities.login', 110] },
              { $multiply: ['$activities.delegation', 120] },
              { $multiply: ['$activities.community', 130] },
              { $multiply: ['$activities.checking', 150] },
            ],
          },
        },
      },
    ]);

    res.status(200).json({ communities: allCommunitiesWithPoints });
  } catch (error) {
    console.error('Error getting Docker communities:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = { dockerSetup, getAllCommunitiesDocker };
