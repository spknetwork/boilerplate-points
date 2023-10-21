const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { getCommunity } = require("../hive/hive")

const cloneRepository = async (req, res) => {
    const desktopPath = path.join(os.homedir(), 'Desktop'); 
    const folderName = 'ba-community-setup';

    try {
        const customFolderPath = path.join(desktopPath, folderName);

        if (!fs.existsSync(customFolderPath)) {
            fs.mkdirSync(customFolderPath, { recursive: true });
        }

        const communityForkPath = path.join(customFolderPath, 'community-fork');

        exec(`git clone https://github.com/spknetwork/community-fork "${communityForkPath}"`, (error, stdout) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ success: false, message: 'Couldn\'t copy repository' });
            }

            res.status(200).json({ success: true, message: 'Repository cloned successfully. Proceed to step 2.' });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: 'Couldn\'t copy repository' });
    }
};

const createEnvVariables = async (req, res) => {
    const { hive_id, theme, tags } = req.body;
  
    try {
      const community = await getCommunity(hive_id);
  
      if (!community) {
        return res.status(404).json({ success: false, message: "Invalid community provided" });
      }
  
      const communityForkPath = path.join(os.homedir(), 'Desktop', 'ba-community-setup', 'community-fork');
   
      const envContent = `HIVE_ID=${hive_id}\nTHEME=${theme}\nTAGS=${tags}`;

      console.log(envContent)
  
        fs.writeFileSync(path.join(communityForkPath, '.env.local'), envContent);
  
      return res.status(200).json({ success: true, message: '.env.local file created successfully. Proceed to step 3.', community });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Something went wrong" });
    }
  };  
  
const checkDirectory = (req, res) => {
    const communityForkPath = path.join(os.homedir(), 'Desktop', 'ba-community-setup', 'community-fork');
    const directoryExists = fs.existsSync(communityForkPath);
    res.status(200).json({ directoryExists });
}

const checkEnvFile = (req, res) => {
    const communityForkPath = path.join(os.homedir(), 'Desktop', 'ba-community-setup', 'community-fork');
    const envFileExists = fs.existsSync(communityForkPath);
    res.status(200).json({ envFileExists });
};

const runDocker =  (req, res) => {
    const communityForkPath = path.join(os.homedir(), 'Desktop', 'ba-community-setup', 'community-fork');
  
    exec('docker-compose up -d', { cwd: communityForkPath }, (error, stdOut) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Couldn\'t run project' });
      }
  
      res.status(200).json({ success: true, message: 'Project started successfully.' });
    });
};

module.exports = {
    cloneRepository,
    createEnvVariables,
    checkDirectory,
    checkEnvFile,
    runDocker
}