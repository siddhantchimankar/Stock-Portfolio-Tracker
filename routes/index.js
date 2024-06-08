const express = require('express');
const router = express.Router();
const stock = require('../models/stock');
const redis = require('redis');
const request = require('request');
const user = require('../models/user');
const schedule = require('node-schedule');
const winston = require('winston');

// Set up Redis client
const redisPORT = process.env.REDIS_PORT || 6379;
const client = redis.createClient(redisPORT);

// Set up Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

client.on('error', (err) => {
  logger.error(`Redis Error: ${err}`);
});

client.connect().catch((err) => logger.error(`Redis Connection Error: ${err}`));

const APIkey = 'YG6FYVDN29CRL1ED';

// Schedule job to update stocks
schedule.scheduleJob('0 0 * * *', () => {
  stock.find({}).then((data) => {
    data.forEach((obj) => {
      stock.findOneAndUpdate(obj).catch((err) => logger.error(`Stock Update Error: ${err}`));
    });
  }).catch((err) => logger.error(`Stock Find Error: ${err}`));
});

// Routes
router.get('/delete/:username', (req, res) => {
  res.render('delete', { username: req.params.username });
});

router.post('/delete/:username', async (req, res) => {
  const stockname = req.body.name.toUpperCase();
  const username = req.params.username;

  try {
    await user.updateOne(
      { username: username },
      { $pull: { portfolio: { name: stockname } } }
    );
    res.redirect(`/profile/${username}`);
  } catch (err) {
    logger.error(`Delete Stock Error: ${err}`);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/addstock/:username', (req, res) => {
  res.render('addstock', { username: req.params.username });
});

router.post('/addstock/:username', async (req, res) => {
  const stockname = req.body.name.toUpperCase();
  const username = req.params.username;

  try {
    const userFound = await user.findOne({
      username: username,
      'portfolio.name': stockname,
    });

    if (userFound) {
      return res.redirect(`/profile/${username}`);
    }

    const cacheExists = await client.exists(stockname);

    if (cacheExists) {
      const newstock = new stock({
        name: await client.hGet(stockname, 'name'),
        PE_RATIO: await client.hGet(stockname, 'PE_RATIO'),
        PEG_RATIO: await client.hGet(stockname, 'PEG_RATIO'),
        PB_RATIO: await client.hGet(stockname, 'PB_RATIO'),
        EV_EBITDA_RATIO: await client.hGet(stockname, 'EV_EBITDA_RATIO'),
      });

      await user.updateOne(
        { username: username },
        { $push: { portfolio: newstock } }
      );
    } else {
      await makeAPICall(stockname, username);
    }

    res.redirect(`/profile/${username}`);
  } catch (err) {
    logger.error(`Add Stock Error: ${err}`);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/:username', async (req, res) => {
  try {
    const userFound = await user.findOne({ username: req.params.username });
    if (!userFound) {
      return res.status(404).send('User Not Found');
    }

    res.render('index', {
      title: 'Stock Portfolio Tracker',
      stocks: userFound.portfolio,
      username: req.params.username,
    });
  } catch (err) {
    logger.error(`Get User Error: ${err}`);
    res.status(500).send('Internal Server Error');
  }
});

// Helper function to make API call
const makeAPICall = async (stockname, username) => {
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${stockname}&apikey=${APIkey}`;

  return new Promise((resolve, reject) => {
    request.get(
      {
        url: url,
        json: true,
        headers: { 'User-Agent': 'request',
        rejectUnauthorized: false  },
      },
      async (err, res, data) => {
        if (err) {
          logger.error(`API Call Error: ${err}`);
          return reject(err);
        } else if (res.statusCode !== 200) {
          logger.error(`API Response Status: ${res.statusCode}`);
          return reject(new Error(`API Response Status: ${res.statusCode}`));
        }

        try {
          const newstock = new stock({
            name: data.Symbol,
            PE_RATIO: data.PERatio,
            PEG_RATIO: data.PEGRatio,
            PB_RATIO: data.PriceToBookRatio,
            EV_EBITDA_RATIO: data.EVToEBITDA,
          });

          await user.updateOne(
            { username: username },
            { $push: { portfolio: newstock } }
          );

          await client.hSet(stockname, 'name', newstock.name);
          await client.hSet(stockname, 'PE_RATIO', newstock.PE_RATIO);
          await client.hSet(stockname, 'PEG_RATIO', newstock.PEG_RATIO);
          await client.hSet(stockname, 'PB_RATIO', newstock.PB_RATIO);
          await client.hSet(stockname, 'EV_EBITDA_RATIO', newstock.EV_EBITDA_RATIO);

          resolve();
        } catch (dbErr) {
          logger.error(`Database Update Error: ${dbErr}`);
          reject(dbErr);
        }
      }
    );
  });
};

module.exports = router;
