const config = require('../../config.js');
const Exchange = require('./exchange.js');
const signer = require('./signer.js');
const util = require('./util.js');

function OKExchange(cred) {
  Exchange.call(this, cred);
  this.name = 'okex';
  var conf = config.exchanges[this.name];
  this.label = conf.label;
  this.logger = require('./logger.js')(this.name);

  this.dataHost = conf.data_host;
  this.tradeHost = conf.trade_host;

	if(cred) {
		this.access_key = cred.keys[this.name].access_key;
		this.signer = new signer.OKSigner(cred.[this.name].secret_key);
	}
}

OKExchange.prototype = Object.create(Exchange.prototype);
OKExchange.prototype.constructor = OKExchange;

OKExchange.prototype.coinpairFilter = function(coinpair) {
  return coinpair;
}

OKExchange.prototype.coinnameFilter = function(coinname) {
  return coinname.toLowerCase();
}

OKExchange.prototype.prepareDepthRequest = function(coinpair) {
  coinpair = this.coinpairFilter(coinpair);
  var url = util.format("%s/api/v1/depth.do?symbol=%s", this.dataHost, coinpair);
  return {
    uri: url,
    method: 'GET'
  };
}

OKExchange.prototype.processDepthData = function(coinpair, data) {
  if(!data.asks || data.asks.length == 0) throw new Error("No asks in depth data!");
  if(!data.bids || data.bids.length == 0) throw new Error("No bids in depth data!");
  this.depth.update(coinpair, data.asks, data.bids, data.timestamp);
  this.logger.debug("Updated depth " + this.depth.str());
}

OKExchange.prototype.prepareStorageRequest = function() {
	var param = util.format('api_key=%s', this.access_key);
  var sig = this.signer.sign(param);
  var url = util.format('%s/api/v1/userinfo.do', this.tradeHost);
  var body = {
    api_key: this.access_key,
    sign: sig + ''
  };
  return {
    uri: url,
    method: 'POST',
    body: body
  };
}

OKExchange.prototype.processStorageData = function(data) {
  if(!data.info) {
    if(data.message) throw new Error(data.message);
    throw new Error("Failed to get storage data");
  }
  var funds = data.info.funds;
  var freefund = funds.free;
  var freezfund = funds.freezed;
  for(var coin in freefund) {
    var avail = Number(freefund[coin]);
    var freez = Number(freezfund[coin]);
    var name = this.coinnameFilter(coin);
    this.storage.update(name, avail, freez);
  }
}

OKExchange.prototype.preparePendingTradeRequest = function(coinpair) {
  coinpair = this.coinpairFilter(coinpair);
	var param='api_key='+this.access_key+'&order_id=-1&symbol='+coinpair;
  var sig = this.signer.sign(param);
  var url = util.format("%s/api/v1/order_info.do", this.dataHost);
  var body = {
    api_key: this.access_key,
    symbol: coinpair,
    order_id: -1,
    sign: sig+''
  };
  return {
    uri: url,
    method: 'POST',
    body: body
  };
}

OKExchange.prototype.processPendingTradeData = function(coinpair, data) {
  var me = this;
  if(!data.result || !info.orders) throw new Error("Failed to get pending trade data!");
  this.orders = [];
  data.orders.forEach(function(order, i){
    me.orders.push({
      amount: order.amount,
      deal_amount: order.deal_amount,
      price: order.price,
      type: order.type
    });
  });
}

OKExchange.prototype.prepareTradeRequest = function(coinpair, price, amount, type) {
  coinpair = this.coinpairFilter(coinpair);
	var param='amount='+amount+'&api_key='+this.access_key+'&price='+price+'&symbol='+coinpair+'&type='+type;
  var sig = this.signer.sign(param);
  var url = util.format("%s/api/v1/trade.do", this.dataHost);
  var body = {
    api_key: this.access_key,
    symbol: coinpair,
    type: type,
    price: price,
    amount: amount,
    sign: sig+'',
  };
  return {
    uri: url,
    method: 'POST',
    body: body
  };
}

OKExchange.prototype.processTradeData = function(coinpair, price, amount, type, data) {
  if(!data.result) throw new Error("Trade request rejected!");
  id = data.order_id;
  this.trades[id] = {
    id: id,
    coinpair: coinpair,
    price: price,
    amount: amount,
    type: type,
    time: util.getNow(),
  };
  this.logger.info("New trade recorded: "+JSON.stringify(me.trades[id]));
}

OKExchange.prototype.amountFilter = function(x,coinpair,price,type) {
	if(coinpair == "hsr_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('hsr').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		if(x < 0.1) x = 0;
	} else if(coinpair == "xrp_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('xrp').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		if(x < 1) x = 0;
	} else if(coinpair == "eos_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('eos').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
	} else if(coinpair == "qtum_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('qtum').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
	} else if(coinpair == "btc_usdt") {
		if(type == "sell") x = Math.min(x,this.storage.get('qtum').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
	}
	return x;
}

module.exports = OKExchange;
