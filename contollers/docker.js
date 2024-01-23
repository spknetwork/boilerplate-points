const Docker = require("../models/Docker");

const dockerSetup = async (req, res) => {
    const { containerName, port, tags, communityId, domain } = req.body;
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
      domain,
    });

    await newDocker.save();

    res.status(200).json({ message: 'Community registered successfully', communityDocker: newDocker });
  } catch (error) {
    console.error('Error registering community:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { dockerSetup };
