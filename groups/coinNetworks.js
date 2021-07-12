coininfo = require('coininfo');

module.exports = {
  DOGE: coininfo.dogecoin.main.toBitcoinJS(),
  DASH: coininfo.dash.main.toBitcoinJS(),
  BTC: coininfo.bitcoin.main.toBitcoinJS() 
}
