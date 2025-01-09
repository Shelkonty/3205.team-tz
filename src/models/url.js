const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true
    },
    shortUrl: {
        type: String,
        required: true,
        unique: true
    },
    alias: {
        type: String,
        unique: true,
        sparse: true,
        maxLength: 20
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date
    },
    clickCount: {
        type: Number,
        default: 0
    },
    clicks: [{
        timestamp: Date,
        ip: String
    }]
});

module.exports = mongoose.model('Url', urlSchema);