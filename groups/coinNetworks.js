import coininfo from 'coininfo'

export default Object.freeze({
  DOGE: coininfo.dogecoin.main.toBitcoinJS(),
  DASH: coininfo.dash.main.toBitcoinJS(),
  BTC: coininfo.bitcoin.main.toBitcoinJS() 
})
