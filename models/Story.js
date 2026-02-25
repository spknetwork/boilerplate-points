const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    communityId: { type: String, default: 'breakaway', index: true },
    timestamp: { type: Date, default: Date.now },
    // Automatic deletion after 1 day (24 hours)
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000),
        index: { expiresAfterSeconds: 0 }
    },
    stats: {
        likes: { type: Number, default: 0 },
        tips: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Compound index for group fetching
storySchema.index({ communityId: 1, expiresAt: 1 });
module.exports = mongoose.model('Story', storySchema);
