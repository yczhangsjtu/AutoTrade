const Binance = require('binance-api-node');

const config = require('../../config.js');
const Exchange = require('./exchange.js');
const util = require('./util.js');

function BAExchange(cred) {
  Exchange.call(this, cred);
	this.name = 'binance';
  var conf = config.exchanges[this.name];
  this.label = conf.label;
  this.logger = require('./logger.js')(this.name);

	this.client = Binance.default({
		apiKey: cred.keys[this.name].access_key,
		apiSecret: cred.keys[this.name].secret_key
	});
}

BAExchange.prototype = Object.create(Exchange.prototype);
BAExchange.prototype.constructor = BAExchange;

BAExchange.prototype.coinnameFilter = function(coinname) {
	if(coinname == "HC") coinname = "HSR";
	return coinname.toLowerCase();
}

BAExchange.prototype.coinpairFilter = function(coinpair) {
	if(coinpair == "hsr_btc") coinpair = "hc_btc";
	var coins = coinpair.split('_');
	return coins[0].toUpperCase()+coins[1].toUpperCase();
}

var depthFilter = function(pair) {
  return [Number(pair.price),Number(pair.quantity)];
};

BAExchange.prototype.updateDepth = function(coinpair, cb, ecb) {
	var me = this;
	this.client.book({symbol:this.coinpairFilter(coinpair)}).then(function(info){
		if(info.asks && info.bids) {
			var asks = info.asks.map(depthFilter);
			var bids = info.bids.map(depthFilter);
			me.depth.update(coinpair, asks, bids);
			me.logger.debug("Updated depth " + me.depth.str());
			cb(null, JSON.stringify(info));
		} else {
			ecb(new Error("No asks or bids data"), info);
		}
	}).catch(function(error){
		ecb(error, null);
	});
}

BAExchange.prototype.updateStorage = function(cb, ecb) {
	var me = this;
	this.logger.debug("Updating account storage info");
	this.client.accountInfo().then(function(info){
		if(info.balances) {
			var coins = info.balances;
			for(var i in coins) {
				var coin = coins[i];
				var avail = Number(coin.free);
				var freez = Number(coin.locked);
				var name = me.coinnameFilter(coin.asset);
				me.logger.debug("Updating storage of "+name+" to ["+avail+","+freez+"]");
				me.storage.update(name, avail, freez);
			}
			cb(null, JSON.stringify(info));
		} else {
			ecb(new Error("Failed to get account info"), null);
		}
	}).catch(function(error){
		ecb(error, null);
	});
}

BAExchange.prototype.updatePendingTrade = function(coinpair, cb, ecb) {
	var me = this;
	this.logger.debug("Updating pending trade info");
	this.client.openOrders({symbol:this.coinpairFilter(coinpair)}).then(function(info){
		if(info instanceof Array) {
			me.orders = [];
			info.forEach(function(order,i){
				var type;
				me.orders.push({
					amount: order.origQty,
					deal_amount: order.executedQty,
					price: order.price,
					type: order.side.toLowerCase(),
				});
			});
			cb(null, JSON.stringify(info));
		} else {
			ecb(new Error("failed to get order info"), null);
		}
	}).catch(function(error){
    ecb(error, null);
	});
}

BAExchange.prototype.trade = function(coinpair, price, amount, type, cb, ecb) {
	var me = this;
	this.logger.debug("Sending trade request");
	this.client.order({
		symbol: this.coinpairFilter(coinpair),
		side: type.toUpperCase(),
		quantity: amount,
		price: price,
	}).then(function(info){
		if(info) {
			var id = info.orderId;
			me.trades[id] = {
				id: id,
				coinpair: coinpair,
				price: price,
				amount: amount,
				type: type,
				time: new Date(),
			};
			cb(null, info);
		} else {
			ecb(new Error("Received null from server. Unknown error occurred."), null);
		}
	}).catch(function(error){
		ecb(error, null);
	});
}

BAExchange.prototype.amountFilter = function(x,coinpair,price,type) {
	if(coinpair == "hsr_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('hsr').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x/0.01)*0.01;
		if(x*price < 0.002) x = 0;
		if(x < 0.01) x = 0;
	} else if(coinpair == "xrp_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('xrp').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x);
		if(x*price < 0.002) x = 0;
		if(x < 1) x = 0;
	} else if(coinpair == "eos_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('eos').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x);
		if(x*price < 0.002) x = 0;
		if(x < 1) x = 0;
	} else if(coinpair == "qtum_btc") {
		if(type == "sell") x = Math.min(x,this.storage.get('qtum').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('btc').avail/price);
		x = Math.floor(x/0.01)*0.01;
		if(x*price < 0.002) x = 0;
		if(x < 0.01) x = 0;
	} else if(coinpair == "btc_usdt") {
		if(type == "sell") x = Math.min(x,this.storage.get('btc').avail);
		if(type == "buy") x = Math.min(x,this.storage.get('usdt').avail/price);
		x = Math.floor(x/0.000001)*0.000001;
		if(x*price < 10) x = 0;
		if(x < 0.000001) x = 0;
	}
	return x;
}

