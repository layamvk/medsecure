const redis = require('redis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = redis.createClient({ url: redisUrl });

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Failed to connect to Redis', err);
    }
};

module.exports = { redisClient, connectRedis };
