const express = require('express');
const axios = require('axios');

const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANm%2BfQAAAAAA8zDDCkKoevsBALh3h45jYoz%2Fs50%3DHXMv5rq2cQzgULbcdm0qvT5qCRyAvU78GN41Mq9yahK5ba0vs2'
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Allen Lin' });
});

router.get('/tweet/:tweetId', (req, res) => {
  axios.get(`https://api.twitter.com/2/tweets/${req.params.tweetId}?tweet.fields=created_at`,
    { headers: {"Authorization": `Bearer ${BEARER_TOKEN}`}})
    .then(response => res.json(response.data))
    .catch(err => res.send(err));
});

router.get('/coinPerformance/:coin/:timestamp', (req, res) => {
  let daysAgo = Math.floor(((new Date()).getTime() - parseFloat(req.params.timestamp)) / 86400000) + 1;
  axios.get(`https://api.coingecko.com/api/v3/coins/${req.params.coin}/market_chart`, {
    params: {vs_currency: "usd", days: daysAgo.toString()}})
    .then(response => {
      let prices = response.data.prices.sort((a, b) => a[0] - b[0]);
      let [timeStamp, price] = prices.find(x => x[0] > parseFloat(req.params.timestamp));
      let start = {timeStamp, price};
      prices = prices.slice(prices.findIndex(x => x[0] === timeStamp) + 1);
      [timeStamp, price] = prices[prices.length - 1];
      let end = {timeStamp, price};
      [timeStamp, price] = prices.reduce((accumulator, currentValue) => accumulator[1] < currentValue[1] ? currentValue : accumulator);
      let peak = {timeStamp, price};
      [timeStamp, price] = prices.reduce((accumulator, currentValue) => accumulator[1] > currentValue[1] ? currentValue : accumulator);
      let trough = {timeStamp, price};
      res.json({ start, end, peak, trough });
    })
    .catch(err => res.send(err));
});

module.exports = router;
