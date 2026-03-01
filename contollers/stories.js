const Story = require('../models/Story');
const { postStoryOnchain, getOnchainStories: fetchOnchainStories, ensureDailyContainer, getTodayContainerPermlink, STORY_ACCOUNT } = require('../hive/storyChain');

/**
 * Post a new story (offchain + onchain)
 */
const createStory = async (req, res) => {
    try {
        const { username, content, communityId, postingKey } = req.body;

        if (!username || !content) {
            return res.status(400).json({ success: false, error: 'Username and content are required' });
        }

        // 1. Save offchain to MongoDB (instant, as before)
        const newStory = new Story({
            username,
            content,
            communityId: communityId || 'breakaway',
            timestamp: new Date().toISOString()
        });

        await newStory.save();

        // 2. Fire-and-forget: also broadcast onchain
        //    postingKey is optional — only relay-authenticated users pass it
        //    Keychain users handle the onchain broadcast on the client side
        if (postingKey) {
            postStoryOnchain(username, postingKey, content)
                .then(result => {
                    if (result?.trxId) {
                        // Optionally record the trx ID on the story doc
                        Story.findByIdAndUpdate(newStory._id, { hiveTrxId: result.trxId }).catch(() => { });
                    }
                })
                .catch(err => console.error('[createStory] Onchain broadcast error:', err.message));
        }

        return res.json({ success: true, story: newStory });
    } catch (error) {
        console.error('CreateStory Error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to create story' });
    }
};

/**
 * Get active offchain stories for a community (default, 24hr window)
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

        const grouped = Object.keys(userStories).map(username => ({
            username,
            stories: userStories[username]
        }));

        return res.json({ success: true, stories: grouped });
    } catch (error) {
        console.error('GetStories Error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch stories' });
    }
};

/**
 * Get onchain stories from Hive for a specific date
 * Query params: ?date=YYYY-MM-DD (defaults to today)
 */
const getOnchainStories = async (req, res) => {
    try {
        const { date } = req.query; // optional 'YYYY-MM-DD'
        const stories = await fetchOnchainStories(date || null);
        return res.json({ success: true, stories });
    } catch (error) {
        console.error('GetOnchainStories Error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch onchain stories' });
    }
};

/**
 * Get (and ensure creation of) today's daily container post.
 * Frontend calls this before posting a story onchain to get the parent author/permlink.
 */
const getStoryContainer = async (req, res) => {
    try {
        const permlink = getTodayContainerPermlink();
        // Ensure it exists (no-op if already created today)
        await ensureDailyContainer();
        return res.json({
            success: true,
            container: { author: STORY_ACCOUNT, permlink }
        });
    } catch (error) {
        console.error('GetStoryContainer Error:', error.message);
        // Still return the permlink even if creation fails — Keychain will error on broadcast if needed
        return res.json({
            success: true,
            container: { author: STORY_ACCOUNT, permlink: getTodayContainerPermlink() }
        });
    }
};

module.exports = { createStory, getStories, getOnchainStories, getStoryContainer };
