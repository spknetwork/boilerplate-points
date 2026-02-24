const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    username: { type: String, required: true, index: true },
    content: {
        type: { type: String, enum: ['text', 'image'], default: 'text' },
        text: String,
        imageUrl: String
    },
    timestamp: { type: Date, default: Date.now },
    // Automatic deletion after 1 day (24 hours)
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000),
        index: { expiresAfterSeconds: 0 }
    },
    communityId: { type: String, index: true }, // For future multi-community support
    stats: {
        likes: { type: Number, default: 0 },
        tips: { type: Number, default: 0 }
    }
});

// Compound index for group fetching
storySchema.index({ communityId: 1, expiresAt: 1 });

module.exports = mongoose.model('Story', storySchema);
