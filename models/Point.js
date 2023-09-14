const mongoose = require('mongoose');
const schema = mongoose.Schema;


const PointSchema = schema({
    user: {
        type: schema.Types.ObjectId,
        ref: 'user'
    },
    points: {
        type: Number,
        default: 0
    },
    points_by_type: {
        10: {
            type: Number,
            default: 0
        },
        20: {
            type: Number,
            default: 0
        },
        30: {
            type: Number,
            default: 0
        },
        100: {
            type: Number,
            default: 0
        },
        110: {
            type: Number,
            default: 0
        },
        120: {
            type: Number,
            default: 0
        },
        130: {
            type: Number,
            default: 0
        },
        150: {
            type: Number,
            default: 0
        },
        160: {
            type: Number,
            default: 0
        },
    },
    pointsBalance: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: ""
    },
    unclaimed_points: {
        type: Number,
        default: 0
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
})

module.exports = mongoose.model('Point', PointSchema);