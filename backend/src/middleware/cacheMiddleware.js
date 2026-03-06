const { redisClient } = require('../config/redis');

const cacheMiddleware = (durationInSeconds = 60) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;

        try {
            // Check if Redis is ready (handle cases where it isn't connected yet)
            if (!redisClient.isReady) {
                return next();
            }

            const cachedData = await redisClient.get(key);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }

            // Override res.json to cache the response
            const originalJson = res.json;
            res.json = function (body) {
                if (res.statusCode >= 200 && res.statusCode < 300 && redisClient.isReady) {
                    redisClient.setEx(key, durationInSeconds, JSON.stringify(body));
                }
                originalJson.call(this, body);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

module.exports = { cacheMiddleware };
