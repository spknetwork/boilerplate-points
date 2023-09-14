const mongoose = require('mongoose');
const schema = mongoose.Schema;

const UserSchema = schema({
    username: {
        type: String,
        unique: true
    },
    community: String,
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

module.exports = mongoose.model('User', UserSchema);
