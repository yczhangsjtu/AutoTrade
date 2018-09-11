const config = require('../../config.js');
const Exchange = require('./exchange.js');
const signer = require('./signer.js');
const util = require('./util.js');

function ZBExchange(cred) {
  Exchange.call(this, cred);
  this.name = 'zb';
  var conf = config.exchanges[this.name];
  this.label = conf.label;
  this.logger = require('./logger.js')(this.name);

  this.dataHost = conf.data_host;
  this.tradeHost = conf.trade_host;

	if(cred) {
		this.access_key = cred.keys[this.name].access_key;
		this.signer = new signer.ZBSigner(cred.[this.name].secret_key);
	}
}

ZBExchange.prototype = Object.create(Exchange.prototype);
ZBExchange.prototype.constructor = ZBExchange;

ZBExchange.prototype.coinpairFilter = function(coinpair) {
  return coinpair;
}

ZBExchange.prototype.coinnameFilter = function(coinname) {
  return coinname.toLowerCase();
}

ZBExchange.prototype.prepareDepthRequest = function(coinpair) {
  coinpair = this.coinpairFilter(coinpair);
  var url = util.format("%s/data/v1/depth?market=%s&size=50", this.dataHost, coinpair);
  return {
    uri: url,
    method: 'GET'
  };
}

ZBExchange.prototype.processDepthData = function(coinpair, data) {
  if(!data.asks || data.asks.length == 0) throw new Error("No asks in depth data!");
  if(!data.bids || data.bids.length == 0) throw new Error("No bids in depth data!");
  this.depth.update(coinpair, data.asks, data.bids, data.timestamp);
  this.logger.debug("Updated depth " + this.depth.str());
}

ZBExchange.prototype.prepareStorageRequest = function() {
	var param=util.format('accesskey=%s&method=getAccountInfo', this.access_key);
  var sig = this.signer.sign(param);
  var url = util.format('%s/api/getAccountInfo?%s&sign=%s&reqTime=%d', this.tradeHost, param, sig, util.getNowSecond());
  return {
    uri: url,
    method: 'GET'
  };
}

ZBExchange.prototype.processStorageData = function(data) {
  if(!data.result) {
    if(data.message) throw new Error(data.message);
    throw new Error("Failed to get storage data");
  }
  var coins = data.result.coins;
  for(var i in coins) {
    var coin = coins[i];
    var avail = Number(coin.available);
    var freez = Number(coin.freez);
    var name = this.coinnameFilter(coin.enName);
    this.storage.update(name, avail, freez);
  }
}

ZBExchange.prototype.preparePendingTradeRequest = function(coinpair) {
  coinpair = this.coinpairFilter(coinpair);
	var param='accesskey='+this.access_key+'&currency='+coinpair+'&method=getUnfinishedOrdersIgnoreTradeType&pageIndex=1&pageSize=10';
  var sig = this.signer.sign(param);
  var url = util.format("%s/api/getUnfinishedOrdersIgnoreTradeType?%s&sign=%s&reqTime=%s", this.dataHost, param, sig, util.getNowSecond());
  return {
    uri: url,
    method: 'GET'
  };
}

ZBExchange.prototype.processPendingTradeData = function(coinpair, data) {
  var me = this;
  if(data instanceof Array) {
    this.orders = [];
    data.forEach(function(order, i) {
      var type;
      if(order.type == 0) type = "sell";
      if(order.type == 1) type = "buy";
      me.orders.push({
        amount: order.total_amount,
        deal_amount: order.trade_amount,
        price: order.price,
        type: type,
      });
    });
  } else {
    if(info.code == 3001) {
      this.orders = [];
    } else {
      if(data.message) throw new Error(data.message);
      throw new Error("Failed to get pending trade data");
    }
  }
}

ZBExchange.prototype.prepareTradeRequest = function(coinpair, price, amount, type) {
  coinpair = this.coinpairFilter(coinpair);
  var tradetype = '0';
	if(type == 'buy') tradetype = '1';
	var param = util.format('accesskey=%s&amount=%f&currency=%s&method=order&price=%f&tradeType=%s', this.access_key, amount, coinpair, price, tradetype);
  var sig = this.signer.sign(param);
  var url = util.format("%s/api/order?%s&sign=%s&reqTime=%s", this.dataHost, param, sig, util.getNowSecond());
  return {
    uri: url,
    method: 'GET'
  };
}

ZBExchange.prototype.processTradeData = function(coinpair, price, amount, type, data) {
  if(data.code != "1000") throw new Error("Trade request rejected!");
  id = info.id;
  me.trades[id] = {
    id: id,
    coinpair: coinpair,
    price: price,
    amount: amount,
    type: type,
    time: util.getNow()
  };
  this.logger.info("New trade recorded: "+JSON.stringify(me.trades[id]));
}

ZBExchange.prototype.amountFilter = function(x, coinpair, price, type) {
	if(coinpair == "hsr_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('hsr').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x/0.01)*0.01;
	} else if(coinpair == "xrp_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('xrp').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x);
	} else if(coinpair == "eos_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('eos').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x/0.1)*0.1;
	} else if(coinpair == "qtum_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('qtum').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x/0.01)*0.01;
	} else if(coinpair == "btc_usdt") {
		if(type == "sell") x = Math.min(x,this.storage.get('btc').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('usdt').avail/price);
		x = Math.floor(x/0.0001)*0.0001;
	}
	return x;
}

module.exports = ZBExchange;
