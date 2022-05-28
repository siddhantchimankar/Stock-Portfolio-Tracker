
var express = require('express');
var router = express.Router();
var stock = require('../models/stock');
const redis = require('redis');
var APIkey = 'YG6FYVDN29CRL1ED';
var request = require('request');
const user = require('../models/user');
var redisconnect = false;


const redisPORT = process.env.PORT || 6379;
const client = redis.createClient(redisPORT);
client.on('error', (err) => {
  console.log("Error " + err);
});



const schedule = require('node-schedule');
const res = require('express/lib/response');

schedule.scheduleJob('0 0 * * *', () => { 

  stock.find({}).then(data => {

      data.forEach((obj) => {

          stock.findOneAndUpdate(obj);

      })
  });
})




router.get('/delete/:username', (req, res) => {
  res.render('delete', {username : req.params.username});
})

router.post('/delete/:username', async(req, res) => {

  var stockname = req.body.name.toUpperCase();

  var username = req.params.username;

  console.log(username, stockname);
  await user.updateOne(
    { username: username }, 
    { $pull: { portfolio: { name: stockname } } },

  );

  res.redirect('/profile/' + username);
});





router.get('/addstock/:username', (req, res) => {
  //console.log('get addstock yo...');
  res.render('addstock', {username : req.params.username});
})

router.post('/addstock/:username', async(req, res) => {

  //console.log('add stock post ...');
  var stockname = req.body.name.toUpperCase();
  var username = req.params.username;

  //console.log(username, stockname);

  var found = await user.find(
    { username: username, portfolio: { $elemMatch: { name: stockname } } }
  )

   // console.log(found);

  if(found == null) res.redirect('/profile/' + username);
  else {

    var found = await client.exists(stockname);

    if(found) {

      console.log('cache hit ....');

      var newstock = new stock({
        name : client.HGET(stockname, 'name'),
        PE_RATIO : client.HGET(stockname, 'PE_RATIO'),
        PEG_RATIO : client.HGET(stockname, 'PEG_RATIO'),
        PB_RATIO : client.HGET(stockname, 'PB_RATIO'),
        EV_EBITDA_RATIO : client.HGET(stockname, 'EV_EBITDA_RATIO') 

      });

      await user.updateOne( {username : username},{ $push: { portfolio: newstock } });
      res.redirect('/profile/' + username);

    }else {

      makeacall(stockname, username, () => {
        res.redirect('/profile/' + username);
      });
    }
  }
});






router.get('/:username', async function(req, res, next) {

  if(redisconnect == false) await client.connect();
  redisconnect = true;

    user.findOne({username : req.params.username}).then(async(user) => {
      //console.log(user);
     // console.log('hitting db ...');

  
      res.render('index', {title : 'Stock Portfolio Tracker', stocks : user.portfolio, 
      username : req.params.username});
    });
  
});






var makeacall = async(stockname, username, cb) => {

  var url = 'https://www.alphavantage.co/query?function=OVERVIEW&symbol=' + stockname + 
  '&apikey=' + APIkey;

  request.get({
    url: url,
    json: true,
    headers: {'User-Agent': 'request'}
  }, async(err, res, data) => {
    if (err) {
      console.log('Error:', err);
    } else if (res.statusCode !== 200) {
      console.log('Status:', res.statusCode);
    } else {

      var newstock = new stock({
        name : data.Symbol,
        PE_RATIO : data.PERatio,
        PEG_RATIO : data.PEGRatio,
        PB_RATIO : data.PriceToBookRatio,
        EV_EBITDA_RATIO : data.EVToEBITDA 

      });

      console.log('hitting db ...');
      await user.updateOne( {username : username},{ $push: { portfolio: newstock } });
      client.HSET(stockname, 'name' , newstock.name);
      client.HSET(stockname, 'PE_RATIO' , newstock.PE_RATIO);
      client.HSET(stockname, 'PE_RATIO' , newstock.PE_RATIO);
      client.HSET(stockname, 'PE_RATIO' , newstock.PE_RATIO);
      client.HSET(stockname, 'PE_RATIO' , newstock.PE_RATIO);
      cb();
    }
  });
}
              
module.exports = router;
