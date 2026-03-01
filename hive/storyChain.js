const { PrivateKey } = require('@hiveio/dhive');
const client = require('./client');

const STORY_ACCOUNT = process.env.HIVE_RELAY_ACCOUNT || 'breakaway.app';
const STORY_POSTING_KEY = process.env.HIVE_RELAY_POSTING_KEY;
const APP_TAG = 'bac/stories/1.0';

/**
 * Returns the deterministic permlink for today's story container
 * Format: bac-stories-YYYY-MM-DD
 */
function getTodayContainerPermlink(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `bac-stories-${y}-${m}-${d}`;
}

/**
 * Returns the permlink for a specific date string YYYY-MM-DD
 */
function getContainerPermlink(dateStr) {
    return `bac-stories-${dateStr}`;
}

/**
 * Check if the daily container post already exists on Hive
 */
async function containerExists(permlink) {
    try {
        const content = await client.database.call('get_content', [STORY_ACCOUNT, permlink]);
        return content && content.author === STORY_ACCOUNT;
    } catch {
        return false;
    }
}

/**
 * Creates the daily container post on-chain from the breakaway.app account.
 * This is a top-level post (no parent) tagged for easy discovery.
 */
async function ensureDailyContainer() {
    if (!STORY_POSTING_KEY) {
        console.warn('⚠️ [StoryChain] HIVE_RELAY_POSTING_KEY not set — skipping container creation');
        return null;
    }

    const permlink = getTodayContainerPermlink();
    const today = new Date().toISOString().split('T')[0];

    try {
        const exists = await containerExists(permlink);
        if (exists) {
            console.log(`ℹ️ [StoryChain] Today's container already exists: ${STORY_ACCOUNT}/${permlink}`);
            return { author: STORY_ACCOUNT, permlink };
        }

        const key = PrivateKey.fromString(STORY_POSTING_KEY);

        const op = ['comment', {
            parent_author: '',
            parent_permlink: 'bac-stories',
            author: STORY_ACCOUNT,
            permlink,
            title: `BAC Stories — ${today}`,
            body: `Daily story container for Breakaway Communities — ${today}.\n\nAll community stories for this day are replies to this post.`,
            json_metadata: JSON.stringify({
                app: APP_TAG,
                type: 'story-container',
                date: today,
                tags: ['bac-stories', 'breakaway', 'stories']
            })
        }];

        const tx = await client.broadcast.sendOperations([op], key);
        console.log(`✅ [StoryChain] Daily container created: ${STORY_ACCOUNT}/${permlink} | tx: ${tx.id}`);
        return { author: STORY_ACCOUNT, permlink, trxId: tx.id };
    } catch (err) {
        console.error(`❌ [StoryChain] Failed to create daily container:`, err.message);
        return null;
    }
}

/**
 * Broadcasts a story as a Hive comment reply to today's daily container.
 * @param {string} username - The story author's Hive username
 * @param {string} postingKey - The author's posting key (from relay/keychain flow)
 * @param {object} content - { type: 'text'|'image', text, imageUrl }
 * @returns {{ trxId: string }|null}
 */
async function postStoryOnchain(username, postingKey, content) {
    if (!postingKey) {
        console.warn(`⚠️ [StoryChain] No posting key provided for @${username}`);
        return null;
    }

    const containerPermlink = getTodayContainerPermlink();
    const now = Date.now();
    const permlink = `bac-story-${username}-${now}`;

    // Build body
    let body = content.text || '';
    if (content.imageUrl) {
        body = content.imageUrl + (content.text ? `\n\n${content.text}` : '');
    }
    if (!body.trim()) body = '📸 (Story)';

    try {
        const key = PrivateKey.fromString(postingKey);

        const op = ['comment', {
            parent_author: STORY_ACCOUNT,
            parent_permlink: containerPermlink,
            author: username,
            permlink,
            title: '',
            body,
            json_metadata: JSON.stringify({
                app: APP_TAG,
                type: 'story',
                content,
                tags: ['bac-stories', 'breakaway']
            })
        }];

        const tx = await client.broadcast.sendOperations([op], key);
        console.log(`✅ [StoryChain] Story broadcast onchain by @${username} | tx: ${tx.id}`);
        return { trxId: tx.id, permlink };
    } catch (err) {
        console.error(`❌ [StoryChain] onchain story failed for @${username}:`, err.message);
        return null;
    }
}

/**
 * Fetch onchain stories (replies to a day's container).
 * @param {string|null} dateStr - 'YYYY-MM-DD', defaults to today
 * @returns {Array<GroupedStory>}
 */
async function getOnchainStories(dateStr = null) {
    const permlink = dateStr ? getContainerPermlink(dateStr) : getTodayContainerPermlink();

    try {
        const replies = await client.database.call('get_content_replies', [STORY_ACCOUNT, permlink]);
        if (!Array.isArray(replies)) return [];

        // Group by author
        const byUser = {};
        for (const reply of replies) {
            let meta = {};
            try { meta = JSON.parse(reply.json_metadata || '{}'); } catch { /**/ }

            if (meta.type !== 'story') continue; // Skip non-story replies

            const story = {
                _id: `${reply.author}-${reply.permlink}`,
                username: reply.author,
                content: meta.content || { type: 'text', text: reply.body },
                timestamp: reply.created,
                expiresAt: null, // Onchain stories don't expire
                hiveTrxId: reply.permlink,
                isOnchain: true,
                stats: {
                    likes: reply.net_votes || 0,
                    tips: 0
                }
            };

            if (!byUser[reply.author]) byUser[reply.author] = [];
            byUser[reply.author].push(story);
        }

        return Object.keys(byUser).map(username => ({ username, stories: byUser[username] }));
    } catch (err) {
        console.error(`❌ [StoryChain] Failed to fetch onchain stories for ${permlink}:`, err.message);
        return [];
    }
}

module.exports = {
    getTodayContainerPermlink,
    getContainerPermlink,
    ensureDailyContainer,
    postStoryOnchain,
    getOnchainStories,
    STORY_ACCOUNT
};
