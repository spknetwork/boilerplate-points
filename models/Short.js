const mongoose = require('mongoose');

const shortSchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    content: {
        type: {
            type: String,
            enum: ['video'],
            default: 'video'
        },
        videoUrl: { type: String, required: true },
        thumbnailUrl: { type: String },
        caption: { type: String }
    },
    communityId: { type: String, default: 'breakaway', index: true },
    timestamp: { type: Date, default: Date.now },
    // Shorts are more permanent than stories, but we can set a long TTL or keep them
    // For now, let's keep them without automatic expiration or set to 30 days
    expiresAt: {
        type: Date,
        default: null
    },
    stats: {
        likes: { type: Number, default: 0 },
        tips: { type: Number, default: 0 },
        views: { type: Number, default: 0 }
    },
    tippedBy: [{ type: String, index: true }],
    hiveTrxId: { type: String, default: null },

    permlink: { type: String, default: null }
}, {
    timestamps: true
});

shortSchema.index({ communityId: 1, timestamp: -1 });
module.exports = mongoose.model('Short', shortSchema);
