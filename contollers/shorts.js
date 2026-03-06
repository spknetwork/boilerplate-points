const Short = require('../models/Short');
const { postShortOnchain, ensureDailyShortsContainer, getTodayShortsPermlink, STORY_ACCOUNT } = require('../hive/storyChain');

/**
 * Post a new short video (offchain + onchain)
 */
const createShort = async (req, res) => {
    try {
        const { username, content, communityId, postingKey } = req.body;

        if (!username || !content || !content.videoUrl) {
            return res.status(400).json({ success: false, error: 'Username and video content are required' });
        }

        // 1. Save offchain to MongoDB
        const newShort = new Short({
            username,
            content: {
                ...content,
                type: 'video'
            },
            communityId: communityId || 'breakaway',
            timestamp: new Date().toISOString()
        });

        await newShort.save();

        // 2. Broadcast onchain if postingKey provided
        if (postingKey) {
            postShortOnchain(username, postingKey, content)
                .then(result => {
                    if (result?.trxId) {
                        Short.findByIdAndUpdate(newShort._id, {
                            hiveTrxId: result.trxId,
                            permlink: result.permlink
                        }).catch(() => { });
                    }
                })
                .catch(err => console.error('[createShort] Onchain broadcast error:', err.message));
        }

        return res.json({ success: true, short: newShort });
    } catch (error) {
        console.error('CreateShort Error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to create short' });
    }
};

/**
 * Get active shorts for a community
 */
const getShorts = async (req, res) => {
    try {
        let { communityId = 'breakaway', viewer } = req.query;
        if (viewer) viewer = viewer.replace(/^@/, '');



        let query = { communityId };
        if (communityId === 'global') {
            query = {}; // Fetch all shorts if global
        }

        // Fetch last 100 shorts for now
        const shorts = await Short.find(query)
            .sort({ timestamp: -1 })
            .limit(100);

        // If viewer is provided, check if each short was tipped by them
        const processedShorts = shorts.map(short => {
            const shortObj = short.toObject();
            if (viewer) {
                shortObj.hasTipped = short.tippedBy?.includes(viewer);

            }
            // remove tippedBy from response for privacy/size if needed, but keeping for now
            return shortObj;
        });


        return res.json({ success: true, shorts: processedShorts });
    } catch (error) {
        console.error('GetShorts Error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch shorts' });
    }
};

/**
 * Record a tip for a short
 */
const recordTip = async (req, res) => {
    try {
        const { id } = req.params;
        let { username } = req.body;
        if (username) username = username.replace(/^@/, '');



        if (!username) {
            return res.status(400).json({ success: false, error: 'Username is required' });
        }

        const short = await Short.findById(id);
        if (!short) {
            return res.status(404).json({ success: false, error: 'Short not found' });
        }

        if (!short.tippedBy) short.tippedBy = [];

        // Add to tippedBy if not already there
        if (!short.tippedBy.includes(username)) {


            short.tippedBy.push(username);
            short.stats.tips = (short.stats.tips || 0) + 1;
            await short.save();
        } else {

        }


        return res.json({ success: true, hasTipped: true });
    } catch (error) {
        console.error('RecordTip Error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to record tip' });
    }
};


/**
 * Get (and ensure creation of) today's shorts container post.
 */
const getShortsContainer = async (req, res) => {
    try {
        const permlink = getTodayShortsPermlink();
        await ensureDailyShortsContainer();
        return res.json({
            success: true,
            container: { author: STORY_ACCOUNT, permlink }
        });
    } catch (error) {
        console.error('GetShortsContainer Error:', error.message);
        return res.json({
            success: true,
            container: { author: STORY_ACCOUNT, permlink: getTodayShortsPermlink() }
        });
    }
};

module.exports = { createShort, getShorts, getShortsContainer, recordTip };

