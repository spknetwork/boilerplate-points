const Community = require('../models/Community');

const registerCommunity = async (req, res) => {
    try {
      const { communityName, about, communityFounder, communityId } = req.body;
  
      const existingCommunity = await Community.findOne({ communityId });
  
      if (existingCommunity) {
        return res.status(400).json({ message: 'Community already registered.' });
      }
  
      const newCommunity = new Community({
        communityName,
        about,
        communityFounder,
        communityId,
      });
  
      await newCommunity.save();
  
      res.status(201).json({ message: 'Community registered successfully.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  //would only be needed if we want communities to register with url
const createCommunity = async (req, res) => {
    try {
      const { communityName, about, communityFounder, communityId, communityUrl } = req.body;

      const isCommunityIdUnique = await Community.findOne({ communityId });
      const isCommunityUrlUnique = await Community.findOne({ communityUrl });

      if (isCommunityIdUnique || isCommunityUrlUnique) {
        return res.status(400).json({ message: 'Community ID or URL is not unique' });
      }

      const newCommunity = new Community({
        communityName,
        about,
        communityFounder,
        communityId,
        communityUrl,
      });

      await newCommunity.save();
      res.status(201).json(newCommunity);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  module.exports = { registerCommunity, createCommunity }