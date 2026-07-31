const mongoose = require("mongoose");
const UserPoints = require("./models/UserPoints");
require("dotenv").config({ path: __dirname + '/.env' });

mongoose.connect(process.env.uri)
  .then(async () => {
    let user = await UserPoints.findOne({ username: "adesojisouljay", communityId: "sovraniche" });
    if (!user) {
        user = new UserPoints({ username: "adesojisouljay", communityId: "sovraniche", totalPoints: 0, unclaimedPoints: 0 });
    }
    user.totalPoints += 53;
    await user.save();
    console.log("Successfully credited adesojisouljay! New balance: " + user.totalPoints);
    process.exit(0);
  });
