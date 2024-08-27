const Docker = require("../models/Docker");

const dockerSetup = async (req, res) => {
  const { containerName, port, tags, communityId, domain, platformCreator, aboutPlatform } = req.body;

  try {
    console.log("Request Body:", req.body);

    // Check if a community with the same domain already exists
    const existingCommunity = await Docker.findOne({ domain });
    if (existingCommunity) {
      return res.status(400).json({ error: 'Community with this domain already exists' });
    }

    const newDocker = new Docker({
      containerName,
      platformCreator,
      aboutPlatform,
      port,
      tags,
      communityId,
      domain,
    });

    await newDocker.save();

    res.status(200).json({ message: 'Community registered successfully', communityDocker: newDocker });
  } catch (error) {
    console.error('Error registering community:', error.message);
    if (error.code === 11000) { // Duplicate key error code
      res.status(400).json({ error: 'Community with this domain already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

const getDockerSetups = async (req, res) => {
  try {
    const dockerSetups = await Docker.find({});
    res.status(200).json(dockerSetups);
  } catch (error) {
    console.error('Error fetching Docker setups:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSingleDockerSetup = async (req, res) => {
  const { id } = req.params;
  try {
    const dockerSetup = await Docker.find({communityId: id});
    res.status(200).json(dockerSetup);
  } catch (error) {
    console.error('Error fetching Docker setups:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { dockerSetup, getDockerSetups, getSingleDockerSetup };
