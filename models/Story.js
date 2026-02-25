const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        index: true
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    communityId: {
        type: String,
        default: 'breakaway',
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Story', storySchema);
