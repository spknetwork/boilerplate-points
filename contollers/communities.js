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
  
  module.exports = { registerCommunity }