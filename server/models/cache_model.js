require("dotenv").config();
const redis = require("redis");
const { REDISPORT } = process.env || 6379; // redis port setting
const { REDISHOST } = process.env;
const client = redis.createClient(REDISPORT, REDISHOST); // create redis client

function getCache (key) { // used in async function
    return new Promise((resolve, reject) => {
        client.get(key, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
}

function getCardNumberInCache (gmaeID, round, cardID) {
    return new Promise((resolve, reject) => {
        client.get(gmaeID, (err, rawData) => {
            if (err) reject(err);
            const data = JSON.parse(rawData);
            try {
                const number = data[round][cardID];
                resolve(number);
            } catch (err) {
                console.log(`error in cache: ${err}`);
                reject(err);
            }
        });
    });
}

module.exports = {
    client,
    getCache,
    getCardNumberInCache
};
