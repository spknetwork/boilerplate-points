const Story = require('../models/Story');

/**
 * Post a new story
 */
const createStory = async (req, res) => {
    try {
        const { username, content, communityId } = req.body;

        if (!username || !content) {
            return res.status(400).json({ success: false, error: "Username and content are required" });
        }

        const newStory = new Story({
            username,
            content,
            communityId: communityId || 'breakaway',
            timestamp: new Date().toISOString()
        });

        await newStory.save();

        return res.json({ success: true, story: newStory });
    } catch (error) {
        console.error("CreateStory Error:", error.message);
        return res.status(500).json({ success: false, error: "Failed to create story" });
    }
};

/**
 * Get active stories for a community
 */
const getStories = async (req, res) => {
    try {
        const { communityId = 'breakaway' } = req.query;

        const stories = await Story.find({
            communityId,
            expiresAt: { $gt: new Date() }
        }).sort({ timestamp: -1 });

        // Group by user for the StoryBar
        const userStories = {};
        stories.forEach(story => {
            if (!userStories[story.username]) {
                userStories[story.username] = [];
            }
            userStories[story.username].push(story);
        });

        // Convert to array format for frontend
        const grouped = Object.keys(userStories).map(username => ({
            username,
            stories: userStories[username]
        }));

        return res.json({ success: true, stories: grouped });
    } catch (error) {
        console.error("GetStories Error:", error.message);
        return res.status(500).json({ success: false, error: "Failed to fetch stories" });
    }
};

module.exports = { createStory, getStories };
