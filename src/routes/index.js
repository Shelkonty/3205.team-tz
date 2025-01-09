const express = require('express');
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const Url = require('../models/url');

const router = express.Router();

const generateHash = () => {
    return crypto.randomBytes(3).toString('hex');
};

const validateUrl = [
    body('originalUrl').isURL().withMessage('Invalid URL format'),
    body('alias').optional().isLength({ max: 20 }).withMessage('Alias must be less than 20 characters'),
    body('expiresAt').optional().isISO8601().withMessage('Invalid date format')
];

router.post('/shorten', validateUrl, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { originalUrl, alias, expiresAt } = req.body;

        if (alias) {
            const existingUrl = await Url.findOne({ alias });
            if (existingUrl) {
                return res.status(400).json({ error: 'Alias already in use' });
            }
        }

        let shortUrl;
        let existingUrl;
        do {
            shortUrl = alias || generateHash();
            existingUrl = await Url.findOne({ shortUrl });
        } while (existingUrl);

        const url = new Url({
            originalUrl,
            shortUrl,
            alias,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined
        });

        await url.save();
        res.json({ shortUrl: `${req.protocol}://${req.get('host')}/${shortUrl}` });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:shortUrl', async (req, res) => {
    try {
        const url = await Url.findOne({ shortUrl: req.params.shortUrl });

        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        if (url.expiresAt && url.expiresAt < new Date()) {
            return res.status(410).json({ error: 'URL has expired' });
        }

        url.clickCount += 1;
        url.clicks.push({
            timestamp: new Date(),
            ip: req.ip
        });
        await url.save();

        res.redirect(url.originalUrl);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/info/:shortUrl', async (req, res) => {
    try {
        const url = await Url.findOne({ shortUrl: req.params.shortUrl });

        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        if (url.expiresAt && url.expiresAt < new Date()) {
            return res.status(410).json({ error: 'URL has expired' });
        }

        res.json({
            originalUrl: url.originalUrl,
            createdAt: url.createdAt,
            clickCount: url.clickCount,
            expiresAt: url.expiresAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/analytics/:shortUrl', async (req, res) => {
    try {
        const url = await Url.findOne({ shortUrl: req.params.shortUrl });

        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        if (url.expiresAt && url.expiresAt < new Date()) {
            return res.status(410).json({ error: 'URL has expired' });
        }

        const recentIps = url.clicks
            .slice(-5)
            .map(click => click.ip);

        res.json({
            clickCount: url.clickCount,
            recentIps
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/delete/:shortUrl', async (req, res) => {
    try {
        const url = await Url.findOneAndDelete({ shortUrl: req.params.shortUrl });

        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        res.json({ message: 'URL deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;