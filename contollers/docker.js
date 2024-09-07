const Docker = require("../models/Docker");

const dockerSetupRequest = async (req, res) => {
  const {
    containerName,
    port,
    tags,
    communityId,
    domain,
    platformCreator,
    aboutPlatform,
    admins,
    communityTitle
  } = req.body;

  try {
    console.log("Request Body:", req.body);

    const existingCommunity = await Docker.findOne({ communityId });
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
      dockerStatus: 'pending',
      admins: admins || [],
      communityTitle,
    });

    await newDocker.save();

    res.status(200).json({ message: 'Community registered successfully and is pending approval', communityDocker: newDocker });
  } catch (error) {
    console.error('Error registering community:', error.message);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Community with this domain already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

const confirmDockerRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const docker = await Docker.findById(id);

    if (!docker) {
      return res.status(404).json({ error: 'Docker setup not found' });
    }

    if (docker.dockerStatus !== 'pending') {
      return res.status(400).json({ error: 'Docker setup has already been processed' });
    }

    docker.status = 'approved';
    await docker.save();

    res.status(200).json({ message: 'Docker setup approved successfully', communityDocker: docker });
  } catch (error) {
    console.error('Error approving Docker setup:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const cancelDockerRequest = async (req, res) => {
  const { id } = req.params;
  
  try {
    const docker = await Docker.findById(id);

    if (!docker) {
      return res.status(404).json({ error: 'Docker setup not found' });
    }

    if (docker.dockerStatus !== 'pending') {
      return res.status(400).json({ error: 'Docker setup cannot be canceled as it is already processed' });
    }

    docker.dockerStatus = 'canceled'; // Update status to canceled
    await docker.save();

    res.status(200).json({ message: 'Docker setup canceled successfully', communityDocker: docker });
  } catch (error) {
    console.error('Error canceling Docker setup:', error.message);
    res.status(500).json({ error: 'Internal server error' });
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

module.exports = { dockerSetupRequest, getDockerSetups, getSingleDockerSetup, confirmDockerRequest, cancelDockerRequest };
