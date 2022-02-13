coininfo = require('coininfo');

module.exports = {
  DOGE: coininfo.dogecoin.main.toBitcoinJS(),
  DASH: coininfo.dash.main.toBitcoinJS(),
  BTC: coininfo.bitcoin.main.toBitcoinJS(),
  LSK: {
    name: 'Lisk',
    port: 8000,
    wsPort: 8001,
    unit: 'LSK'
  },
}
